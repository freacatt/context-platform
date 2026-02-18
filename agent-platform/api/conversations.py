from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from services.agents import EchoAgent, GeneralManager
from services.auth import AuthedUser, get_current_user
from services.conversation_manager import ConversationManager
from core.deps import get_db
from services.policy_engine import PermissionError, PolicyEngine
from services.usage_tracker import UsageTracker


router = APIRouter(prefix="/conversations", tags=["conversations"])


class ConversationCreateRequest(BaseModel):
    workspace_id: UUID
    title: str | None = None


class ConversationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    title: str | None


class MessageCreateRequest(BaseModel):
    conversation_id: UUID
    role: str
    content: str


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str


class DirectAgentRequest(BaseModel):
    workspace_id: UUID
    prompt: str


class DirectAgentResponse(BaseModel):
    output: str


class GMTaskRequest(BaseModel):
    workspace_id: UUID
    task: str


class GMTaskResponse(BaseModel):
    output: str


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreateRequest,
    current_user: AuthedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    policy = PolicyEngine(db)
    try:
        policy.assert_workspace_owner(current_user.firebase_uid, payload.workspace_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    manager = ConversationManager(db)
    conversation = manager.start_conversation(
        firebase_uid=current_user.firebase_uid,
        workspace_id=payload.workspace_id,
        title=payload.title,
    )
    tracker = UsageTracker(db)
    tracker.log_event(
        firebase_uid=current_user.firebase_uid,
        event_type="conversation_created",
        workspace_id=payload.workspace_id,
        details=str(conversation.id),
    )
    return ConversationResponse(
        id=conversation.id,
        workspace_id=conversation.workspace_id,
        title=conversation.title,
    )


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def add_message(
    payload: MessageCreateRequest,
    current_user: AuthedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    manager = ConversationManager(db)
    message = manager.add_message(
        conversation_id=payload.conversation_id,
        role=payload.role,
        content=payload.content,
    )
    tracker = UsageTracker(db)
    tracker.log_event(
        firebase_uid=current_user.firebase_uid,
        event_type="message_created",
        workspace_id=None,
        details=str(message.id),
    )
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        role=message.role,
        content=message.content,
    )


@router.post("/direct-agent", response_model=DirectAgentResponse)
def direct_agent(
    payload: DirectAgentRequest,
    current_user: AuthedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DirectAgentResponse:
    policy = PolicyEngine(db)
    try:
        policy.assert_workspace_owner(current_user.firebase_uid, payload.workspace_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    agent = EchoAgent()
    output = agent.run(payload.prompt)
    tracker = UsageTracker(db)
    tracker.log_event(
        firebase_uid=current_user.firebase_uid,
        event_type="direct_agent_call",
        workspace_id=payload.workspace_id,
        details=None,
    )
    return DirectAgentResponse(output=output)


@router.post("/gm-task", response_model=GMTaskResponse)
def gm_task(
    payload: GMTaskRequest,
    current_user: AuthedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GMTaskResponse:
    policy = PolicyEngine(db)
    try:
        policy.assert_workspace_owner(current_user.firebase_uid, payload.workspace_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    gm = GeneralManager()
    output = gm.handle_task(payload.task)
    tracker = UsageTracker(db)
    tracker.log_event(
        firebase_uid=current_user.firebase_uid,
        event_type="gm_task",
        workspace_id=payload.workspace_id,
        details=None,
    )
    return GMTaskResponse(output=output)
