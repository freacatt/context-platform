from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.firestore import get_firestore_client
from core.exceptions import AppError
from services.auth import AuthedUser, get_current_user
from services.policy_engine import PolicyEngine
from services.prompt_templates import render_prompt, list_prompt_types
from services.chat_service import ChatService
from services import agents as agent_service

router = APIRouter(prefix="/recommend", tags=["recommend"])


class RecommendRequest(BaseModel):
    workspace_id: str
    agent_id: str
    prompt_type: str
    variables: dict[str, str] = {}


class RecommendResponse(BaseModel):
    response: str
    prompt_type: str
    model: str


@router.get("/prompt-types")
def get_prompt_types() -> list[str]:
    """List all available prompt types."""
    return list_prompt_types()


@router.post("", response_model=RecommendResponse)
def recommend(
    payload: RecommendRequest,
    current_user: AuthedUser = Depends(get_current_user),
) -> RecommendResponse:
    db = get_firestore_client()
    policy = PolicyEngine(db)
    policy.assert_workspace_owner(current_user.firebase_uid, payload.workspace_id)

    # Validate agent belongs to workspace
    agent_data = agent_service.get_agent(db, payload.agent_id)
    if agent_data.get("workspaceId") != payload.workspace_id:
        raise AppError(
            code="AGENT_WORKSPACE_MISMATCH",
            message="Agent does not belong to this workspace",
            status_code=400,
        )

    # Build prompt from template
    try:
        prompt = render_prompt(payload.prompt_type, payload.variables)
    except ValueError as exc:
        raise AppError(code="INVALID_PROMPT_TYPE", message=str(exc), status_code=400)

    # Call LLM
    chat_service = ChatService()
    response_text, model_used = chat_service.chat(
        agent_data=agent_data,
        message=prompt,
    )

    return RecommendResponse(
        response=response_text,
        prompt_type=payload.prompt_type,
        model=model_used,
    )
