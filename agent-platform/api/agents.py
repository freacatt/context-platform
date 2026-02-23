from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from core.firestore import get_firestore_client
from services.auth import AuthedUser, get_current_user
from services.policy_engine import PolicyEngine
from services import agents as agent_service


router = APIRouter(prefix="/agents", tags=["agents"])


# --- Nested models for new fields ---


class AppAccessEntry(BaseModel):
    app_id: str
    permissions: list[str] = []


class McpServerEntry(BaseModel):
    name: str
    url: str
    auth: dict = {}


class OrchestratorConfig(BaseModel):
    can_delegate_to_agents: bool = True
    auto_select_agent: bool = True
    fallback_behavior: str = "handle_self"


# --- Request / Response models ---


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
    is_orchestrator: bool = False
    app_access: list[AppAccessEntry] = []
    mcp_servers: list[McpServerEntry] = []
    orchestrator_config: OrchestratorConfig | None = None
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
    is_orchestrator: bool = False
    app_access: list[AppAccessEntry] = []
    mcp_servers: list[McpServerEntry] = []
    orchestrator_config: OrchestratorConfig | None = None


class AgentUpdateRequest(BaseModel):
    name: str | None = None
    model_mode: str | None = None
    model_provider: str | None = None
    model_name: str | None = None
    skills: list[str] | None = None
    context: str | None = None
    is_orchestrator: bool | None = None
    app_access: list[AppAccessEntry] | None = None
    mcp_servers: list[McpServerEntry] | None = None
    orchestrator_config: OrchestratorConfig | None = None


# --- Conversion helpers ---


_SNAKE_TO_CAMEL = {
    "model_mode": "modelMode",
    "model_provider": "modelProvider",
    "model_name": "modelName",
    "workspace_id": "workspaceId",
    "is_orchestrator": "isOrchestrator",
    "app_access": "appAccess",
    "mcp_servers": "mcpServers",
    "orchestrator_config": "orchestratorConfig",
}


def _snake_to_camel(data: dict) -> dict:
    """Convert snake_case keys to camelCase for Firestore storage.

    Also handles nested conversion for appAccess entries and orchestratorConfig.
    """
    result = {}
    for k, v in data.items():
        camel_key = _SNAKE_TO_CAMEL.get(k, k)
        if camel_key == "appAccess" and isinstance(v, list):
            v = [_convert_app_access_entry(e) for e in v]
        elif camel_key == "mcpServers" and isinstance(v, list):
            v = [e if isinstance(e, dict) else e.model_dump() for e in v]
        elif camel_key == "orchestratorConfig" and v is not None:
            v = _convert_orchestrator_config(v)
        result[camel_key] = v
    return result


def _convert_app_access_entry(entry) -> dict:
    if isinstance(entry, dict):
        return {"appId": entry.get("app_id", entry.get("appId", "")), "permissions": entry.get("permissions", [])}
    return {"appId": entry.app_id, "permissions": entry.permissions}


def _convert_orchestrator_config(config) -> dict:
    if isinstance(config, dict):
        return {
            "canDelegateToAgents": config.get("can_delegate_to_agents", config.get("canDelegateToAgents", True)),
            "autoSelectAgent": config.get("auto_select_agent", config.get("autoSelectAgent", True)),
            "fallbackBehavior": config.get("fallback_behavior", config.get("fallbackBehavior", "handle_self")),
        }
    return {
        "canDelegateToAgents": config.can_delegate_to_agents,
        "autoSelectAgent": config.auto_select_agent,
        "fallbackBehavior": config.fallback_behavior,
    }


def _to_response(agent_data: dict) -> AgentResponse:
    created_at = agent_data.get("createdAt")
    updated_at = agent_data.get("updatedAt")

    # Convert appAccess from Firestore camelCase to API snake_case
    raw_access = agent_data.get("appAccess", [])
    app_access = [
        AppAccessEntry(
            app_id=a.get("appId", ""),
            permissions=a.get("permissions", []),
        )
        for a in raw_access
    ]

    # Convert mcpServers
    raw_mcp = agent_data.get("mcpServers", [])
    mcp_servers = [McpServerEntry(**s) for s in raw_mcp] if raw_mcp else []

    # Convert orchestratorConfig
    raw_orch = agent_data.get("orchestratorConfig")
    orchestrator_config = None
    if raw_orch:
        orchestrator_config = OrchestratorConfig(
            can_delegate_to_agents=raw_orch.get("canDelegateToAgents", True),
            auto_select_agent=raw_orch.get("autoSelectAgent", True),
            fallback_behavior=raw_orch.get("fallbackBehavior", "handle_self"),
        )

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
        is_orchestrator=agent_data.get("isOrchestrator", False),
        app_access=app_access,
        mcp_servers=mcp_servers,
        orchestrator_config=orchestrator_config,
        created_at=str(created_at) if created_at else None,
        updated_at=str(updated_at) if updated_at else None,
    )


# --- Endpoints ---


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
