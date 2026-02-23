"""Session API endpoints."""

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel

from core.exceptions import AppError, ForbiddenError
from core.firestore import get_firestore_client
from services.auth import AuthedUser, get_current_user
from services.chat_service import ChatService
from services.execution_service import ExecutionService
from services.permission_service import get_agent_tools
from services.policy_engine import PolicyEngine
from services import agents as agent_service
from services import session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


# --- Request / Response Models ---


class SessionCreateRequest(BaseModel):
    workspace_id: str
    agent_id: str
    title: str | None = None
    chat_only: bool = False


class SessionMessageRequest(BaseModel):
    message: str
    context: str | None = None


class SessionStatusUpdateRequest(BaseModel):
    status: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    metadata: dict = {}


class SessionResponse(BaseModel):
    id: str
    workspace_id: str
    agent_id: str
    user_id: str
    title: str | None
    status: str
    messages: list[MessageResponse]
    metadata: dict
    parent_session_id: str | None
    created_at: str | None
    updated_at: str | None


class SessionListItem(BaseModel):
    id: str
    workspace_id: str
    agent_id: str
    title: str | None
    status: str
    message_count: int
    last_message_preview: str | None
    created_at: str | None
    updated_at: str | None


class ToolCallTrace(BaseModel):
    tool_id: str
    args: dict
    result: dict


class SessionMessageResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    model: str
    tool_calls: list[ToolCallTrace] = []


# --- Helpers ---


def _to_message_response(msg: dict) -> MessageResponse:
    return MessageResponse(
        id=msg.get("id", ""),
        role=msg.get("role", ""),
        content=msg.get("content", ""),
        timestamp=msg.get("timestamp", ""),
        metadata=msg.get("metadata", {}),
    )


def _to_session_response(data: dict) -> SessionResponse:
    created_at = data.get("createdAt")
    updated_at = data.get("updatedAt")
    messages = [_to_message_response(m) for m in data.get("messages", [])]
    return SessionResponse(
        id=data["id"],
        workspace_id=data.get("workspaceId", ""),
        agent_id=data.get("agentId", ""),
        user_id=data.get("userId", ""),
        title=data.get("title"),
        status=data.get("status", "active"),
        messages=messages,
        metadata=data.get("metadata", {}),
        parent_session_id=data.get("parentSessionId"),
        created_at=str(created_at) if created_at else None,
        updated_at=str(updated_at) if updated_at else None,
    )


def _to_list_item(data: dict) -> SessionListItem:
    messages = data.get("messages", [])
    last_preview = None
    if messages:
        last_msg = messages[-1]
        content = last_msg.get("content", "")
        last_preview = content[:100] + "..." if len(content) > 100 else content
    created_at = data.get("createdAt")
    updated_at = data.get("updatedAt")
    return SessionListItem(
        id=data["id"],
        workspace_id=data.get("workspaceId", ""),
        agent_id=data.get("agentId", ""),
        title=data.get("title"),
        status=data.get("status", "active"),
        message_count=len(messages),
        last_message_preview=last_preview,
        created_at=str(created_at) if created_at else None,
        updated_at=str(updated_at) if updated_at else None,
    )


# --- Endpoints ---


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreateRequest,
    current_user: AuthedUser = Depends(get_current_user),
) -> SessionResponse:
    db = get_firestore_client()
    policy = PolicyEngine(db)
    policy.assert_workspace_owner(current_user.firebase_uid, payload.workspace_id)

    agent_data = agent_service.get_agent(db, payload.agent_id)
    if agent_data.get("workspaceId") != payload.workspace_id:
        raise AppError(
            code="AGENT_WORKSPACE_MISMATCH",
            message="Agent does not belong to the specified workspace",
            status_code=403,
        )

    session_data = session_service.create_session(
        db,
        workspace_id=payload.workspace_id,
        agent_id=payload.agent_id,
        user_id=current_user.firebase_uid,
        title=payload.title,
        chat_only=payload.chat_only,
    )
    return _to_session_response(session_data)


@router.get("", response_model=list[SessionListItem])
def list_sessions(
    workspace_id: str,
    agent_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: AuthedUser = Depends(get_current_user),
) -> list[SessionListItem]:
    db = get_firestore_client()
    policy = PolicyEngine(db)
    policy.assert_workspace_owner(current_user.firebase_uid, workspace_id)

    sessions = session_service.list_sessions(
        db, workspace_id, agent_id=agent_id, status=status_filter,
    )
    return [_to_list_item(s) for s in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> SessionResponse:
    db = get_firestore_client()
    data = session_service.get_session(db, session_id)
    if data.get("userId") != current_user.firebase_uid:
        raise ForbiddenError("You do not own this session")
    return _to_session_response(data)


@router.post("/{session_id}/messages", response_model=SessionMessageResponse)
def send_message(
    session_id: str,
    payload: SessionMessageRequest,
    current_user: AuthedUser = Depends(get_current_user),
) -> SessionMessageResponse:
    db = get_firestore_client()

    # Validate session ownership and status
    session_data = session_service.get_session(db, session_id)
    if session_data.get("userId") != current_user.firebase_uid:
        raise ForbiddenError("You do not own this session")
    if session_data.get("status") != "active":
        raise AppError(
            code="SESSION_NOT_ACTIVE",
            message="Cannot send messages to a non-active session",
        )

    # Add user message
    user_msg = session_service.add_message(db, session_id, "user", payload.message)

    # Generate title from first message if none exists
    if not session_data.get("title"):
        title = session_service.generate_session_title(payload.message)
        db.collection("sessions").document(session_id).update({"title": title})

    # Reload session to get updated messages
    session_data = session_service.get_session(db, session_id)

    # Load agent config
    agent_data = agent_service.get_agent(db, session_data["agentId"])

    # Check if agent has tools — use ExecutionService if so, else plain ChatService
    # Chat-only sessions always skip tools even if agent has them
    chat_only = session_data.get("metadata", {}).get("chatOnly", False)
    agent_tools = get_agent_tools(agent_data)

    try:
        if not chat_only and agent_tools:
            # Tool-augmented execution
            execution = ExecutionService(db, agent_data, session_data)
            result = execution.execute(payload.message, context=payload.context)
            response_text = result["response"]
            model_used = result["model"]
            tool_call_traces = [
                ToolCallTrace(tool_id=tc["tool_id"], args=tc["args"], result=tc["result"])
                for tc in result.get("tool_calls", [])
            ]
        else:
            # Simple chat (no tools)
            chat_service = ChatService()
            session_messages = session_data.get("messages", [])
            history = []
            for msg in session_messages[:-1]:
                if msg.get("role") in ("user", "assistant"):
                    history.append({"role": msg["role"], "content": msg["content"]})
            response_text, model_used = chat_service.chat(
                agent_data=agent_data,
                message=payload.message,
                history=history,
                context=payload.context,
            )
            tool_call_traces = []
    except Exception as exc:
        raise AppError(
            code="LLM_ERROR",
            message=f"Failed to get response from AI: {exc}",
            status_code=502,
        )

    # Add assistant message
    assistant_msg = session_service.add_message(
        db, session_id, "assistant", response_text,
        metadata={"model": model_used},
    )

    return SessionMessageResponse(
        user_message=_to_message_response(user_msg),
        assistant_message=_to_message_response(assistant_msg),
        model=model_used,
        tool_calls=tool_call_traces,
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> None:
    db = get_firestore_client()
    session_data = session_service.get_session(db, session_id)
    if session_data.get("userId") != current_user.firebase_uid:
        raise ForbiddenError("You do not own this session")
    session_service.delete_session(db, session_id)


@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: str,
    payload: SessionStatusUpdateRequest,
    current_user: AuthedUser = Depends(get_current_user),
) -> SessionResponse:
    db = get_firestore_client()
    session_data = session_service.get_session(db, session_id)
    if session_data.get("userId") != current_user.firebase_uid:
        raise ForbiddenError("You do not own this session")

    updated = session_service.update_session_status(db, session_id, payload.status)
    return _to_session_response(updated)
