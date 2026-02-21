from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.firestore import get_firestore_client
from core.exceptions import AppError
from services.auth import AuthedUser, get_current_user
from services.policy_engine import PolicyEngine
from services.chat_service import ChatService
from services import agents as agent_service


router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessageEntry(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    workspace_id: str
    agent_id: str
    message: str
    history: list[ChatMessageEntry] = []
    context: str | None = None


class ChatResponse(BaseModel):
    response: str
    agent_id: str
    model: str


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    current_user: AuthedUser = Depends(get_current_user),
) -> ChatResponse:
    """Stateless chat endpoint — send a message, get an LLM response."""
    db = get_firestore_client()
    policy = PolicyEngine(db)

    # Verify workspace ownership
    policy.assert_workspace_owner(current_user.firebase_uid, payload.workspace_id)

    # Load agent config
    agent_data = agent_service.get_agent(db, payload.agent_id)
    if agent_data.get("workspaceId") != payload.workspace_id:
        raise AppError(
            code="AGENT_WORKSPACE_MISMATCH",
            message="Agent does not belong to the specified workspace",
            status_code=403,
        )

    # Call LLM
    history = [entry.model_dump() for entry in payload.history]
    chat_service = ChatService()
    try:
        response_text, model_used = chat_service.chat(
            agent_data=agent_data,
            message=payload.message,
            history=history,
            context=payload.context,
        )
    except Exception as exc:
        raise AppError(
            code="LLM_ERROR",
            message=f"Failed to get response from AI: {exc}",
            status_code=502,
        )

    return ChatResponse(
        response=response_text,
        agent_id=payload.agent_id,
        model=model_used,
    )
