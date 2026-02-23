"""Plan API endpoints for session-scoped plans."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.exceptions import AppError, ForbiddenError
from core.firestore import get_firestore_client
from services.auth import AuthedUser, get_current_user
from services.planning_service import PlanningService
from services import agents as agent_service
from services import session_service

router = APIRouter(prefix="/sessions/{session_id}/plan", tags=["plans"])


# --- Response Models ---


class StepResponse(BaseModel):
    id: str
    description: str
    tool_id: str | None
    args: dict = {}
    status: str
    result: dict | None = None


class PlanResponse(BaseModel):
    goal: str
    status: str
    steps: list[StepResponse]
    created_at: str | None = None
    updated_at: str | None = None


class PlanExecuteResponse(BaseModel):
    plan_status: str
    step_results: list[dict]


# --- Helpers ---


def _validate_session_ownership(db, session_id: str, firebase_uid: str) -> dict:
    data = session_service.get_session(db, session_id)
    if data.get("userId") != firebase_uid:
        raise ForbiddenError("You do not own this session")
    return data


def _to_plan_response(plan: dict) -> PlanResponse:
    return PlanResponse(
        goal=plan.get("goal", ""),
        status=plan.get("status", ""),
        steps=[
            StepResponse(
                id=s.get("id", ""),
                description=s.get("description", ""),
                tool_id=s.get("tool_id"),
                args=s.get("args", {}),
                status=s.get("status", "pending"),
                result=s.get("result"),
            )
            for s in plan.get("steps", [])
        ],
        created_at=plan.get("created_at"),
        updated_at=plan.get("updated_at"),
    )


# --- Endpoints ---


@router.get("", response_model=PlanResponse)
def get_plan(
    session_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> PlanResponse:
    db = get_firestore_client()
    session_data = _validate_session_ownership(db, session_id, current_user.firebase_uid)
    agent_data = agent_service.get_agent(db, session_data["agentId"])

    planning = PlanningService(db, agent_data, session_data)
    plan = planning.get_plan()
    if not plan:
        raise AppError(code="NO_PLAN", message="No plan found for this session", status_code=404)
    return _to_plan_response(plan)


@router.post("/approve", response_model=PlanResponse)
def approve_plan(
    session_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> PlanResponse:
    db = get_firestore_client()
    session_data = _validate_session_ownership(db, session_id, current_user.firebase_uid)
    agent_data = agent_service.get_agent(db, session_data["agentId"])

    planning = PlanningService(db, agent_data, session_data)
    plan = planning.approve_plan()
    return _to_plan_response(plan)


@router.post("/execute", response_model=PlanExecuteResponse)
def execute_plan(
    session_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> PlanExecuteResponse:
    db = get_firestore_client()
    session_data = _validate_session_ownership(db, session_id, current_user.firebase_uid)
    agent_data = agent_service.get_agent(db, session_data["agentId"])

    planning = PlanningService(db, agent_data, session_data)
    result = planning.execute_plan()
    return PlanExecuteResponse(**result)


@router.post("/steps/{step_id}/skip", response_model=StepResponse)
def skip_step(
    session_id: str,
    step_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> StepResponse:
    db = get_firestore_client()
    session_data = _validate_session_ownership(db, session_id, current_user.firebase_uid)
    agent_data = agent_service.get_agent(db, session_data["agentId"])

    planning = PlanningService(db, agent_data, session_data)
    step = planning.skip_step(step_id)
    return StepResponse(
        id=step["id"],
        description=step.get("description", ""),
        tool_id=step.get("tool_id"),
        args=step.get("args", {}),
        status=step["status"],
        result=step.get("result"),
    )
