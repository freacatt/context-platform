"""Tests for the orchestration service."""

import json
from unittest.mock import MagicMock, patch

import pytest
import tools.registry as registry_mod
from tests.conftest import MockFirestoreClient, TEST_FIREBASE_UID
from services.orchestration_service import OrchestrationService, build_delegate_tool_handler


@pytest.fixture(autouse=True)
def reset_registry():
    registry_mod._registry = None
    yield
    registry_mod._registry = None


def _make_db():
    db = MockFirestoreClient()
    db._collections["workspaces"]["ws-1"] = {"userId": TEST_FIREBASE_UID, "name": "Test"}
    return db


def _create_agent(db, agent_data):
    """Create an agent in mock Firestore."""
    from services.agents import create_agent
    return create_agent(db, "ws-1", TEST_FIREBASE_UID, agent_data)


def _make_session(db, agent_id="agent-gm"):
    from services.session_service import create_session
    return create_session(db, "ws-1", agent_id, TEST_FIREBASE_UID)


def test_find_agents_no_candidates():
    """No specialist agents → empty list."""
    db = _make_db()
    # Only GM agent exists
    _create_agent(db, {
        "name": "GM", "type": "gm", "isOrchestrator": True, "appAccess": [],
    })
    orch = OrchestrationService(db, "ws-1", TEST_FIREBASE_UID)
    candidates = orch.find_agents_for_task(required_app_ids=["pyramids"])
    assert candidates == []


def test_find_agents_with_matching_access():
    """Specialist agent with correct app access is found."""
    db = _make_db()
    _create_agent(db, {
        "name": "GM", "type": "gm", "isOrchestrator": True, "appAccess": [],
    })
    specialist = _create_agent(db, {
        "name": "Pyramid Manager",
        "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["create", "read", "list"]}],
    })

    orch = OrchestrationService(db, "ws-1", TEST_FIREBASE_UID)
    candidates = orch.find_agents_for_task(required_app_ids=["pyramids"])
    assert len(candidates) == 1
    assert candidates[0]["name"] == "Pyramid Manager"


def test_find_agents_excludes_orchestrators():
    """Orchestrator agents are excluded from delegation targets."""
    db = _make_db()
    _create_agent(db, {
        "name": "GM", "type": "gm", "isOrchestrator": True, "appAccess": [],
    })
    _create_agent(db, {
        "name": "Sub-Orchestrator",
        "type": "custom",
        "isOrchestrator": True,
        "appAccess": [{"appId": "pyramids", "permissions": ["create"]}],
    })

    orch = OrchestrationService(db, "ws-1", TEST_FIREBASE_UID)
    candidates = orch.find_agents_for_task(required_app_ids=["pyramids"])
    assert len(candidates) == 0


def test_find_agents_permission_filtering():
    """Agent must have required permissions, not just app access."""
    db = _make_db()
    _create_agent(db, {
        "name": "Read-Only Agent",
        "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["read", "list"]}],
    })

    orch = OrchestrationService(db, "ws-1", TEST_FIREBASE_UID)
    # Require create permission — read-only agent should not match
    candidates = orch.find_agents_for_task(
        required_app_ids=["pyramids"],
        required_permissions=["create"],
    )
    assert len(candidates) == 0


def test_find_agents_all_with_no_filter():
    """No filter returns all non-orchestrator agents with app access."""
    db = _make_db()
    _create_agent(db, {"name": "GM", "type": "gm", "isOrchestrator": True, "appAccess": []})
    _create_agent(db, {
        "name": "Agent A", "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["read"]}],
    })
    _create_agent(db, {
        "name": "Agent B", "type": "custom",
        "appAccess": [{"appId": "diagrams", "permissions": ["create"]}],
    })
    # Agent C has no app access — should be excluded
    _create_agent(db, {"name": "Agent C", "type": "custom", "appAccess": []})

    orch = OrchestrationService(db, "ws-1", TEST_FIREBASE_UID)
    candidates = orch.find_agents_for_task()
    assert len(candidates) == 2


@patch("services.orchestration_service.ExecutionService")
def test_delegate_creates_sub_session(mock_exec_cls):
    """Delegation creates a sub-session and returns the result."""
    db = _make_db()
    gm = _create_agent(db, {"name": "GM", "type": "gm", "isOrchestrator": True, "appAccess": []})
    specialist = _create_agent(db, {
        "name": "Pyramid Bot",
        "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["create", "read", "list"]}],
    })

    parent_session = _make_session(db, gm["id"])

    # Mock ExecutionService
    mock_exec = MagicMock()
    mock_exec.execute.return_value = {
        "response": "Created pyramid X.",
        "model": "gpt-4o",
        "tool_calls": [{"tool_id": "pyramids.create", "args": {"title": "X"}, "result": {"success": True}}],
        "messages_added": [],
    }
    mock_exec_cls.return_value = mock_exec

    orch = OrchestrationService(db, "ws-1", TEST_FIREBASE_UID)
    result = orch.delegate(
        parent_session_id=parent_session["id"],
        target_agent=specialist,
        task="Create a pyramid called X",
    )

    assert result["success"] is True
    assert result["agent_name"] == "Pyramid Bot"
    assert result["response"] == "Created pyramid X."
    assert len(result["tool_calls"]) == 1

    # Verify sub-session was created and completed
    sub_session_id = result["session_id"]
    from services.session_service import get_session
    sub = get_session(db, sub_session_id)
    assert sub["status"] == "completed"
    assert sub.get("parentSessionId") == parent_session["id"]


@patch("services.orchestration_service.ExecutionService")
def test_delegate_max_depth(mock_exec_cls):
    """Delegation depth limit prevents infinite loops."""
    db = _make_db()
    specialist = _create_agent(db, {
        "name": "Agent", "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["read"]}],
    })
    parent_session = _make_session(db)

    orch = OrchestrationService(db, "ws-1", TEST_FIREBASE_UID)
    result = orch.delegate(
        parent_session_id=parent_session["id"],
        target_agent=specialist,
        task="Do something",
        depth=3,  # At max depth
    )

    assert result["success"] is False
    assert "Maximum delegation depth" in result["error"]
    mock_exec_cls.assert_not_called()


@patch("services.orchestration_service.ExecutionService")
def test_delegate_stores_trace_in_parent(mock_exec_cls):
    """Delegation result is stored as a message in the parent session."""
    db = _make_db()
    gm = _create_agent(db, {"name": "GM", "type": "gm", "isOrchestrator": True, "appAccess": []})
    specialist = _create_agent(db, {
        "name": "Helper",
        "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["list"]}],
    })
    parent_session = _make_session(db, gm["id"])

    mock_exec = MagicMock()
    mock_exec.execute.return_value = {
        "response": "Done!",
        "model": "gpt-4o",
        "tool_calls": [],
        "messages_added": [],
    }
    mock_exec_cls.return_value = mock_exec

    orch = OrchestrationService(db, "ws-1", TEST_FIREBASE_UID)
    orch.delegate(
        parent_session_id=parent_session["id"],
        target_agent=specialist,
        task="List pyramids",
    )

    from services.session_service import get_session
    parent = get_session(db, parent_session["id"])
    delegation_msgs = [m for m in parent["messages"] if m.get("metadata", {}).get("type") == "delegation"]
    assert len(delegation_msgs) == 1
    content = json.loads(delegation_msgs[0]["content"])
    assert content["success"] is True
    assert content["delegation"]["agent_name"] == "Helper"


@patch("services.orchestration_service.agent_service.get_agent")
def test_build_delegate_handler_direct(mock_get_agent):
    """The __delegate__ handler works with a direct agent_id."""
    db = _make_db()
    parent_session = _make_session(db)

    target = {
        "id": "specialist-1", "name": "Specialist", "type": "custom",
        "appAccess": [], "modelMode": "auto", "modelProvider": None,
        "modelName": None, "context": "",
    }
    mock_get_agent.return_value = target

    handler = build_delegate_tool_handler(db, "ws-1", TEST_FIREBASE_UID, parent_session["id"])

    # Agent has no tools, so it falls through to ChatService
    with patch("services.orchestration_service.get_agent_tools", return_value=[]):
        with patch("services.chat_service.ChatService.chat", return_value=("I helped!", "gpt-4o")):
            result = handler(db, "ws-1", TEST_FIREBASE_UID, {
                "task": "Help me",
                "agent_id": "specialist-1",
            })

    assert result["success"] is True
    assert result["response"] == "I helped!"


def test_build_delegate_handler_no_params():
    """Handler returns error if neither agent_id nor app_ids provided."""
    db = _make_db()
    parent_session = _make_session(db)

    handler = build_delegate_tool_handler(db, "ws-1", TEST_FIREBASE_UID, parent_session["id"])
    result = handler(db, "ws-1", TEST_FIREBASE_UID, {"task": "Help me"})

    assert result["success"] is False
    assert "Must provide either" in result["error"]
