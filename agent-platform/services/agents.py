"""Agent CRUD operations against Firestore."""

from datetime import datetime, timezone

from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud.firestore_v1.client import Client

from core.exceptions import ConflictError, NotFoundError


DEFAULT_GM_AGENT = {
    "name": "Jeana",
    "type": "gm",
    "position": "General Manager",
    "color": "#a855f7",
    "modelMode": "auto",
    "modelProvider": None,
    "modelName": None,
    "skills": [],
    "context": "You are a helpful AI assistant. Answer questions clearly and concisely.",
    "isDefault": True,
    "isOrchestrator": True,
    "appAccess": [],
    "mcpServers": [],
    "orchestratorConfig": {
        "canDelegateToAgents": True,
        "autoSelectAgent": True,
        "fallbackBehavior": "handle_self",
    },
}


def create_agent(db: Client, workspace_id: str, user_id: str, data: dict) -> dict:
    """Create a new agent document in Firestore. Returns the full agent dict with id."""
    now = datetime.now(timezone.utc)
    agent_ref = db.collection("agents").document()
    agent_doc = {
        "workspaceId": workspace_id,
        "userId": user_id,
        "name": data.get("name", "New Agent"),
        "type": data.get("type", "custom"),
        "position": data.get("position", ""),
        "color": data.get("color", ""),
        "modelMode": data.get("modelMode", "auto"),
        "modelProvider": data.get("modelProvider"),
        "modelName": data.get("modelName"),
        "skills": data.get("skills", []),
        "context": data.get("context", ""),
        "isDefault": data.get("isDefault", False),
        "isOrchestrator": data.get("isOrchestrator", False),
        "appAccess": data.get("appAccess", []),
        "mcpServers": data.get("mcpServers", []),
        "orchestratorConfig": data.get("orchestratorConfig", None),
        "createdAt": now,
        "updatedAt": now,
    }
    agent_ref.set(agent_doc)
    agent_doc["id"] = agent_ref.id
    return agent_doc


def create_default_gm_agent(db: Client, workspace_id: str, user_id: str) -> dict:
    """Create the default General Manager agent for a workspace."""
    return create_agent(db, workspace_id, user_id, DEFAULT_GM_AGENT)


def get_agent(db: Client, agent_id: str) -> dict:
    """Get a single agent by ID. Raises NotFoundError if missing."""
    doc = db.collection("agents").document(agent_id).get()
    if not doc.exists:
        raise NotFoundError("agent", agent_id)
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def list_agents(db: Client, workspace_id: str) -> list[dict]:
    """List all agents for a workspace."""
    docs = (
        db.collection("agents")
        .where(filter=FieldFilter("workspaceId", "==", workspace_id))
        .stream()
    )
    agents = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        agents.append(data)
    agents.sort(key=lambda a: str(a.get("createdAt", "")))
    return agents


def update_agent(db: Client, agent_id: str, updates: dict) -> dict:
    """Update agent fields. Returns updated agent dict."""
    ref = db.collection("agents").document(agent_id)
    doc = ref.get()
    if not doc.exists:
        raise NotFoundError("agent", agent_id)

    allowed_fields = {
        "name", "position", "color", "modelMode", "modelProvider", "modelName",
        "skills", "context", "isOrchestrator", "appAccess", "mcpServers",
        "orchestratorConfig",
    }
    filtered = {k: v for k, v in updates.items() if k in allowed_fields}
    filtered["updatedAt"] = datetime.now(timezone.utc)
    ref.update(filtered)

    updated = ref.get().to_dict()
    updated["id"] = ref.id
    return updated


def delete_agent(db: Client, agent_id: str) -> None:
    """Delete an agent. Cannot delete default agents."""
    ref = db.collection("agents").document(agent_id)
    doc = ref.get()
    if not doc.exists:
        raise NotFoundError("agent", agent_id)
    data = doc.to_dict()
    if data.get("isDefault"):
        raise ConflictError("Cannot delete the default agent")
    ref.delete()
