import logging

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from google.cloud.firestore_v1.base_query import FieldFilter

from core.firestore import get_firestore_client
from core.exceptions import AppError, NotFoundError
from services.auth import AuthedUser, get_current_user
from services.policy_engine import PolicyEngine
from services import agents as agent_service
from ai.vector_store.qdrant_client import get_qdrant_client, ensure_workspace_collection
from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class WorkspaceSetupRequest(BaseModel):
    workspace_id: str
    name: str


class WorkspaceSetupResponse(BaseModel):
    workspace_id: str
    gm_agent_id: str


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    gm_agent_id: str | None = None
    ai_recommendation_agent_id: str | None = None
    ai_chat_agent_id: str | None = None


@router.post("/setup", response_model=WorkspaceSetupResponse, status_code=status.HTTP_201_CREATED)
def setup_workspace(
    payload: WorkspaceSetupRequest,
    current_user: AuthedUser = Depends(get_current_user),
) -> WorkspaceSetupResponse:
    """Set up agent infrastructure for an existing workspace.

    Called by the frontend after creating a workspace in Firestore.
    Atomic: if any step fails, previous steps are rolled back.
    """
    db = get_firestore_client()

    # 1. Verify workspace exists in Firestore and is owned by caller
    ws_ref = db.collection("workspaces").document(payload.workspace_id)
    ws_doc = ws_ref.get()
    if not ws_doc.exists:
        raise NotFoundError("workspace", payload.workspace_id)
    ws_data = ws_doc.to_dict()
    if ws_data.get("userId") != current_user.firebase_uid:
        raise AppError(code="FORBIDDEN", message="You do not own this workspace", status_code=403)

    # Track resources for rollback
    created_agent_id: str | None = None
    qdrant_collection_created = False

    try:
        # 2. Create Qdrant namespace
        qdrant = get_qdrant_client()
        ensure_workspace_collection(qdrant, payload.workspace_id, settings.qdrant_vector_size)
        qdrant_collection_created = True

        # 3. Create default GM agent
        gm_agent = agent_service.create_default_gm_agent(
            db, payload.workspace_id, current_user.firebase_uid
        )
        created_agent_id = gm_agent["id"]

        # 4. Update workspace doc with agent references
        ws_ref.update({
            "gmAgentId": created_agent_id,
            "aiRecommendationAgentId": created_agent_id,
            "aiChatAgentId": created_agent_id,
        })

    except Exception:
        logger.exception("Workspace setup failed, rolling back workspace_id=%s", payload.workspace_id)
        # Rollback: delete agent doc if created
        if created_agent_id:
            try:
                db.collection("agents").document(created_agent_id).delete()
            except Exception:
                logger.exception("Rollback: failed to delete agent %s", created_agent_id)
        # Rollback: delete Qdrant collection if created
        if qdrant_collection_created:
            try:
                qdrant = get_qdrant_client()
                collection_name = f"workspace_{payload.workspace_id}"
                qdrant.delete_collection(collection_name)
            except Exception:
                logger.exception("Rollback: failed to delete Qdrant collection for %s", payload.workspace_id)
        raise AppError(
            code="WORKSPACE_SETUP_FAILED",
            message="Failed to set up workspace agent infrastructure. Please try again.",
            status_code=500,
        )

    return WorkspaceSetupResponse(
        workspace_id=payload.workspace_id,
        gm_agent_id=created_agent_id,
    )


@router.delete("/{workspace_id}/teardown", status_code=status.HTTP_204_NO_CONTENT)
def teardown_workspace(
    workspace_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> None:
    """Clean up agent-platform resources for a workspace being deleted.

    Deletes: all agents, all sessions, and the Qdrant collection.
    Called by the frontend before deleting the workspace doc from Firestore.
    """
    db = get_firestore_client()
    policy = PolicyEngine(db)
    policy.assert_workspace_owner(current_user.firebase_uid, workspace_id)

    # 1. Delete all sessions for this workspace
    session_docs = (
        db.collection("sessions")
        .where(filter=FieldFilter("workspaceId", "==", workspace_id))
        .stream()
    )
    for doc in session_docs:
        doc.reference.delete()

    # 2. Delete all agents for this workspace
    agent_docs = (
        db.collection("agents")
        .where(filter=FieldFilter("workspaceId", "==", workspace_id))
        .stream()
    )
    for doc in agent_docs:
        doc.reference.delete()

    # 3. Delete Qdrant collection (best-effort)
    try:
        qdrant = get_qdrant_client()
        collection_name = f"workspace_{workspace_id}"
        qdrant.delete_collection(collection_name)
    except Exception:
        logger.warning("Failed to delete Qdrant collection for workspace %s (may not exist)", workspace_id)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> WorkspaceResponse:
    """Get workspace details including agent configuration."""
    db = get_firestore_client()
    policy = PolicyEngine(db)
    ws_data = policy.assert_workspace_owner(current_user.firebase_uid, workspace_id)
    return WorkspaceResponse(
        id=workspace_id,
        name=ws_data.get("name", ""),
        gm_agent_id=ws_data.get("gmAgentId"),
        ai_recommendation_agent_id=ws_data.get("aiRecommendationAgentId"),
        ai_chat_agent_id=ws_data.get("aiChatAgentId"),
    )
