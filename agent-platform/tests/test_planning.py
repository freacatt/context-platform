"""Tests for the planning service."""

import json
from unittest.mock import MagicMock, patch

import pytest
import tools.registry as registry_mod
from tests.conftest import MockFirestoreClient, TEST_FIREBASE_UID
from services.planning_service import PlanningService


@pytest.fixture(autouse=True)
def reset_registry():
    registry_mod._registry = None
    yield
    registry_mod._registry = None


def _make_db():
    db = MockFirestoreClient()
    db._collections["workspaces"]["ws-1"] = {"userId": TEST_FIREBASE_UID, "name": "Test"}
    return db


def _make_session(db, agent_id="agent-1"):
    from services.session_service import create_session
    return create_session(db, "ws-1", agent_id, TEST_FIREBASE_UID)


def _gm_agent():
    return {
        "id": "agent-1",
        "type": "gm",
        "appAccess": [],
        "modelMode": "auto",
        "modelProvider": None,
        "modelName": None,
        "context": "You are a helpful assistant.",
    }


def _custom_agent():
    return {
        "id": "agent-2",
        "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["create", "read", "list"]}],
        "modelMode": "auto",
        "modelProvider": None,
        "modelName": None,
        "context": "You manage pyramids.",
    }


def test_should_use_planning_explicit():
    agent = _gm_agent()
    assert PlanningService.should_use_planning(agent, "Can you plan how to organize my pyramids?") is True


def test_should_use_planning_complex():
    agent = _gm_agent()
    assert PlanningService.should_use_planning(
        agent, "Create multiple pyramids and then update each one after setting all of them up"
    ) is True


def test_should_not_use_planning_simple():
    agent = _gm_agent()
    assert PlanningService.should_use_planning(agent, "List my pyramids") is False


@patch("services.planning_service.get_chat_model")
def test_generate_plan(mock_get_model):
    """LLM generates a valid JSON plan."""
    mock_llm = MagicMock()
    plan_json = json.dumps({
        "goal": "Create two pyramids",
        "steps": [
            {"id": "step-1", "description": "Create first pyramid", "tool_id": "pyramids.create", "args": {"title": "P1"}},
            {"id": "step-2", "description": "Create second pyramid", "tool_id": "pyramids.create", "args": {"title": "P2"}},
        ]
    })
    mock_response = MagicMock()
    mock_response.content = plan_json
    mock_llm.invoke.return_value = mock_response
    mock_get_model.return_value = mock_llm

    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    plan = planning.generate_plan("Create two pyramids")

    assert plan["goal"] == "Create two pyramids"
    assert plan["status"] == "awaiting_approval"
    assert len(plan["steps"]) == 2
    assert plan["steps"][0]["tool_id"] == "pyramids.create"
    assert plan["steps"][0]["status"] == "pending"


@patch("services.planning_service.get_chat_model")
def test_generate_plan_invalid_tool(mock_get_model):
    """Plan with invalid tool IDs gets them nullified."""
    mock_llm = MagicMock()
    plan_json = json.dumps({
        "goal": "Do something",
        "steps": [
            {"id": "step-1", "description": "Use fake tool", "tool_id": "nonexistent.tool", "args": {}},
        ]
    })
    mock_response = MagicMock()
    mock_response.content = plan_json
    mock_llm.invoke.return_value = mock_response
    mock_get_model.return_value = mock_llm

    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    plan = planning.generate_plan("Do something")

    assert plan["steps"][0]["tool_id"] is None
    assert "not found" in plan["steps"][0]["description"]


def test_store_and_get_plan():
    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    plan = {
        "goal": "Test",
        "status": "awaiting_approval",
        "steps": [{"id": "s1", "description": "Do thing", "tool_id": None, "args": {}, "status": "pending", "result": None}],
        "created_at": "2026-01-01T00:00:00",
        "updated_at": "2026-01-01T00:00:00",
    }
    planning.store_plan(plan)
    retrieved = planning.get_plan()
    assert retrieved["goal"] == "Test"
    assert retrieved["status"] == "awaiting_approval"


def test_approve_plan():
    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    plan = {
        "goal": "Test",
        "status": "awaiting_approval",
        "steps": [{"id": "s1", "description": "Do thing", "tool_id": None, "args": {}, "status": "pending", "result": None}],
        "created_at": "2026-01-01T00:00:00",
        "updated_at": "2026-01-01T00:00:00",
    }
    planning.store_plan(plan)
    approved = planning.approve_plan()
    assert approved["status"] == "executing"


def test_approve_plan_wrong_status():
    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    plan = {
        "goal": "Test", "status": "executing",
        "steps": [], "created_at": "", "updated_at": "",
    }
    planning.store_plan(plan)
    with pytest.raises(ValueError, match="not awaiting approval"):
        planning.approve_plan()


def test_execute_plan_no_tools():
    """Plan with informational steps (no tool_id) completes."""
    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    plan = {
        "goal": "Info plan",
        "status": "executing",
        "steps": [
            {"id": "s1", "description": "Manual step", "tool_id": None, "args": {}, "status": "pending", "result": None},
        ],
        "created_at": "", "updated_at": "",
    }
    planning.store_plan(plan)
    result = planning.execute_plan()

    assert result["plan_status"] == "completed"
    assert len(result["step_results"]) == 1
    assert result["step_results"][0]["success"] is True


def test_execute_plan_with_tool():
    """Plan step executes a real tool against mock Firestore."""
    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    plan = {
        "goal": "Create pyramid",
        "status": "executing",
        "steps": [
            {"id": "s1", "description": "Create it", "tool_id": "pyramids.create", "args": {"title": "Planned Pyramid"}, "status": "pending", "result": None},
        ],
        "created_at": "", "updated_at": "",
    }
    planning.store_plan(plan)
    result = planning.execute_plan()

    assert result["plan_status"] == "completed"
    assert result["step_results"][0]["success"] is True
    # Verify the document was created
    pyramids = db._collections["pyramids"]
    assert len(pyramids) == 1
    doc = list(pyramids.values())[0]
    assert doc["title"] == "Planned Pyramid"


def test_execute_plan_permission_denied():
    """Plan step fails if agent lacks permission."""
    db = _make_db()
    agent = _custom_agent()  # Only has pyramids access
    session = _make_session(db, agent["id"])

    planning = PlanningService(db, agent, session)
    plan = {
        "goal": "Try forbidden tool",
        "status": "executing",
        "steps": [
            {"id": "s1", "description": "Try it", "tool_id": "diagrams.create", "args": {"title": "X"}, "status": "pending", "result": None},
        ],
        "created_at": "", "updated_at": "",
    }
    planning.store_plan(plan)
    result = planning.execute_plan()

    assert result["plan_status"] == "failed"
    assert result["step_results"][0]["success"] is False
    assert "Permission denied" in result["step_results"][0]["error"]


def test_skip_step():
    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    plan = {
        "goal": "Test skip",
        "status": "executing",
        "steps": [
            {"id": "s1", "description": "Step 1", "tool_id": None, "args": {}, "status": "pending", "result": None},
            {"id": "s2", "description": "Step 2", "tool_id": None, "args": {}, "status": "pending", "result": None},
        ],
        "created_at": "", "updated_at": "",
    }
    planning.store_plan(plan)
    step = planning.skip_step("s1")

    assert step["status"] == "skipped"
    # Check plan still has step 2 pending
    updated_plan = planning.get_plan()
    assert updated_plan["steps"][1]["status"] == "pending"


def test_skip_non_pending_step_raises():
    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    plan = {
        "goal": "Test",
        "status": "executing",
        "steps": [
            {"id": "s1", "description": "Done", "tool_id": None, "args": {}, "status": "completed", "result": None},
        ],
        "created_at": "", "updated_at": "",
    }
    planning.store_plan(plan)
    with pytest.raises(ValueError, match="not pending"):
        planning.skip_step("s1")


def test_no_plan_raises():
    db = _make_db()
    session = _make_session(db)
    agent = _gm_agent()

    planning = PlanningService(db, agent, session)
    with pytest.raises(ValueError, match="No plan found"):
        planning.approve_plan()
