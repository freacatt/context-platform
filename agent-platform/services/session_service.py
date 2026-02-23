"""Session CRUD operations against Firestore."""

from datetime import datetime, timezone
from uuid import uuid4

from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud.firestore_v1.client import Client

from core.exceptions import AppError, NotFoundError


def create_session(
    db: Client,
    workspace_id: str,
    agent_id: str,
    user_id: str,
    title: str | None = None,
    parent_session_id: str | None = None,
    chat_only: bool = False,
) -> dict:
    """Create a new session document in Firestore."""
    now = datetime.now(timezone.utc)
    ref = db.collection("sessions").document()
    metadata: dict = {}
    if chat_only:
        metadata["chatOnly"] = True
    doc = {
        "workspaceId": workspace_id,
        "agentId": agent_id,
        "userId": user_id,
        "title": title,
        "status": "active",
        "messages": [],
        "metadata": metadata,
        "parentSessionId": parent_session_id,
        "createdAt": now,
        "updatedAt": now,
    }
    ref.set(doc)
    doc["id"] = ref.id
    return doc


def get_session(db: Client, session_id: str) -> dict:
    """Get a session by ID. Raises NotFoundError if missing."""
    doc = db.collection("sessions").document(session_id).get()
    if not doc.exists:
        raise NotFoundError("session", session_id)
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def list_sessions(
    db: Client,
    workspace_id: str,
    agent_id: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """List sessions for a workspace with optional filters."""
    query = db.collection("sessions").where(
        filter=FieldFilter("workspaceId", "==", workspace_id)
    )
    results = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        if agent_id and data.get("agentId") != agent_id:
            continue
        if status and data.get("status") != status:
            continue
        results.append(data)
    results.sort(key=lambda s: str(s.get("updatedAt", "")), reverse=True)
    return results[:limit]


def add_message(
    db: Client,
    session_id: str,
    role: str,
    content: str,
    metadata: dict | None = None,
) -> dict:
    """Append a message to a session's messages array."""
    ref = db.collection("sessions").document(session_id)
    doc = ref.get()
    if not doc.exists:
        raise NotFoundError("session", session_id)
    data = doc.to_dict()
    message = {
        "id": str(uuid4()),
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata or {},
    }
    messages = data.get("messages", [])
    messages.append(message)
    ref.update({
        "messages": messages,
        "updatedAt": datetime.now(timezone.utc),
    })
    return message


def update_session_status(db: Client, session_id: str, new_status: str) -> dict:
    """Update session status. Valid: active, paused, completed."""
    valid_statuses = {"active", "paused", "completed"}
    if new_status not in valid_statuses:
        raise AppError(
            code="INVALID_STATUS",
            message=f"Invalid status '{new_status}'. Must be one of: {', '.join(sorted(valid_statuses))}",
        )
    ref = db.collection("sessions").document(session_id)
    doc = ref.get()
    if not doc.exists:
        raise NotFoundError("session", session_id)
    data = doc.to_dict()
    current = data.get("status")
    if current == "completed" and new_status != "completed":
        raise AppError(
            code="INVALID_STATUS_TRANSITION",
            message="Cannot change status of a completed session",
        )
    ref.update({
        "status": new_status,
        "updatedAt": datetime.now(timezone.utc),
    })
    updated = ref.get().to_dict()
    updated["id"] = ref.id
    return updated


def delete_session(db: Client, session_id: str) -> None:
    """Delete a session document from Firestore."""
    ref = db.collection("sessions").document(session_id)
    doc = ref.get()
    if not doc.exists:
        raise NotFoundError("session", session_id)
    ref.delete()


def generate_session_title(first_message: str) -> str:
    """Generate a short title from the first user message."""
    title = first_message.strip()
    if len(title) > 60:
        title = title[:57] + "..."
    return title
