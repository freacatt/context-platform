from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from core.firestore import get_firestore_client
from services.auth import AuthedUser, get_current_user
from services.policy_engine import PolicyEngine
from services import agents as agent_service


router = APIRouter(prefix="/agents", tags=["agents"])


class AgentResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    name: str
    type: str
    model_mode: str
    model_provider: str | None = None
    model_name: str | None = None
    skills: list[str] = []
    context: str = ""
    is_default: bool = False
    created_at: str | None = None
    updated_at: str | None = None


class AgentCreateRequest(BaseModel):
    workspace_id: str
    name: str
    type: str = "custom"
    model_mode: str = "auto"
    model_provider: str | None = None
    model_name: str | None = None
    skills: list[str] = []
    context: str = ""


class AgentUpdateRequest(BaseModel):
    name: str | None = None
    model_mode: str | None = None
    model_provider: str | None = None
    model_name: str | None = None
    skills: list[str] | None = None
    context: str | None = None


_SNAKE_TO_CAMEL = {
    "model_mode": "modelMode",
    "model_provider": "modelProvider",
    "model_name": "modelName",
    "workspace_id": "workspaceId",
}


def _snake_to_camel(data: dict) -> dict:
    """Convert snake_case keys to camelCase for Firestore storage."""
    return {_SNAKE_TO_CAMEL.get(k, k): v for k, v in data.items()}


def _to_response(agent_data: dict) -> AgentResponse:
    created_at = agent_data.get("createdAt")
    updated_at = agent_data.get("updatedAt")
    return AgentResponse(
        id=agent_data["id"],
        workspace_id=agent_data.get("workspaceId", ""),
        user_id=agent_data.get("userId", ""),
        name=agent_data.get("name", ""),
        type=agent_data.get("type", "custom"),
        model_mode=agent_data.get("modelMode", "auto"),
        model_provider=agent_data.get("modelProvider"),
        model_name=agent_data.get("modelName"),
        skills=agent_data.get("skills", []),
        context=agent_data.get("context", ""),
        is_default=agent_data.get("isDefault", False),
        created_at=str(created_at) if created_at else None,
        updated_at=str(updated_at) if updated_at else None,
    )


@router.get("", response_model=list[AgentResponse])
def list_agents(
    workspace_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> list[AgentResponse]:
    db = get_firestore_client()
    policy = PolicyEngine(db)
    policy.assert_workspace_owner(current_user.firebase_uid, workspace_id)
    agents = agent_service.list_agents(db, workspace_id)
    return [_to_response(a) for a in agents]


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(
    agent_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> AgentResponse:
    db = get_firestore_client()
    policy = PolicyEngine(db)
    agent_data = policy.assert_agent_access(current_user.firebase_uid, agent_id)
    agent_data["id"] = agent_id
    return _to_response(agent_data)


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def create_agent(
    payload: AgentCreateRequest,
    current_user: AuthedUser = Depends(get_current_user),
) -> AgentResponse:
    db = get_firestore_client()
    policy = PolicyEngine(db)
    policy.assert_workspace_owner(current_user.firebase_uid, payload.workspace_id)
    agent_data = agent_service.create_agent(
        db,
        workspace_id=payload.workspace_id,
        user_id=current_user.firebase_uid,
        data=_snake_to_camel(payload.model_dump(exclude_none=True)),
    )
    return _to_response(agent_data)


@router.put("/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: str,
    payload: AgentUpdateRequest,
    current_user: AuthedUser = Depends(get_current_user),
) -> AgentResponse:
    db = get_firestore_client()
    policy = PolicyEngine(db)
    policy.assert_agent_access(current_user.firebase_uid, agent_id)
    updates = _snake_to_camel(payload.model_dump(exclude_none=True))
    agent_data = agent_service.update_agent(db, agent_id, updates)
    return _to_response(agent_data)


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(
    agent_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> None:
    db = get_firestore_client()
    policy = PolicyEngine(db)
    policy.assert_agent_access(current_user.firebase_uid, agent_id)
    agent_service.delete_agent(db, agent_id)
