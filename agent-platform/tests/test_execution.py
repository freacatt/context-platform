"""Tests for the execution service."""

import json
from unittest.mock import MagicMock, patch

import pytest
import tools.registry as registry_mod
from tests.conftest import MockFirestoreClient, TEST_FIREBASE_UID
from services.execution_service import ExecutionService


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


def _make_session_with_user_msg(db, agent_id="agent-1", message="Hello"):
    session = _make_session(db, agent_id)
    from services.session_service import add_message
    add_message(db, session["id"], "user", message)
    # Reload to get updated messages
    from services.session_service import get_session
    return get_session(db, session["id"])


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


def _custom_agent_with_access():
    return {
        "id": "agent-2",
        "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["create", "read", "list"]}],
        "modelMode": "auto",
        "modelProvider": None,
        "modelName": None,
        "context": "You manage pyramids.",
    }


def _custom_agent_no_access():
    return {
        "id": "agent-3",
        "type": "custom",
        "appAccess": [],
        "modelMode": "auto",
        "modelProvider": None,
        "modelName": None,
        "context": "You are a simple chat bot.",
    }


@patch("services.execution_service.get_chat_model")
def test_simple_text_response(mock_get_model):
    """LLM returns text, no tool calls."""
    mock_llm = MagicMock()
    mock_response = MagicMock()
    mock_response.content = "Hello! How can I help?"
    mock_response.tool_calls = []
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.invoke.return_value = mock_response
    mock_get_model.return_value = mock_llm

    db = _make_db()
    session = _make_session_with_user_msg(db)
    agent = _gm_agent()

    exec_service = ExecutionService(db, agent, session)
    result = exec_service.execute("Hello")

    assert result["response"] == "Hello! How can I help?"
    assert result["tool_calls"] == []


@patch("services.execution_service.get_chat_model")
def test_single_tool_call(mock_get_model):
    """LLM calls one tool, then responds with text."""
    db = _make_db()
    session = _make_session_with_user_msg(db)
    agent = _gm_agent()

    # First call: LLM returns tool call
    tool_call_response = MagicMock()
    tool_call_response.content = ""
    tool_call_response.tool_calls = [{
        "name": "pyramids.list",
        "args": {},
        "id": "call_123",
    }]

    # Second call: LLM returns text after seeing tool result
    text_response = MagicMock()
    text_response.content = "You have 0 pyramids."
    text_response.tool_calls = []

    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.invoke.side_effect = [tool_call_response, text_response]
    mock_get_model.return_value = mock_llm

    exec_service = ExecutionService(db, agent, session)
    result = exec_service.execute("List my pyramids")

    assert result["response"] == "You have 0 pyramids."
    assert len(result["tool_calls"]) == 1
    assert result["tool_calls"][0]["tool_id"] == "pyramids.list"
    assert result["tool_calls"][0]["result"]["success"] is True


@patch("services.execution_service.get_chat_model")
def test_tool_call_permission_denied(mock_get_model):
    """Agent without access tries to use a tool."""
    db = _make_db()
    agent = _custom_agent_with_access()  # has pyramids access only
    session = _make_session_with_user_msg(db, agent["id"])

    # LLM tries to call a tool the agent doesn't have access to
    tool_call_response = MagicMock()
    tool_call_response.content = ""
    tool_call_response.tool_calls = [{
        "name": "product_definitions.create",
        "args": {"title": "Sneaky"},
        "id": "call_456",
    }]

    text_response = MagicMock()
    text_response.content = "I don't have permission."
    text_response.tool_calls = []

    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.invoke.side_effect = [tool_call_response, text_response]
    mock_get_model.return_value = mock_llm

    exec_service = ExecutionService(db, agent, session)
    result = exec_service.execute("Create a product definition")

    assert len(result["tool_calls"]) == 1
    assert result["tool_calls"][0]["result"]["success"] is False
    assert "Permission denied" in result["tool_calls"][0]["result"]["error"]


@patch("services.execution_service.get_chat_model")
def test_tool_calls_stored_in_session(mock_get_model):
    """Tool call and result messages are stored in session."""
    db = _make_db()
    session = _make_session_with_user_msg(db)
    agent = _gm_agent()

    tool_call_response = MagicMock()
    tool_call_response.content = ""
    tool_call_response.tool_calls = [{"name": "pyramids.list", "args": {}, "id": "c1"}]

    text_response = MagicMock()
    text_response.content = "Done."
    text_response.tool_calls = []

    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.invoke.side_effect = [tool_call_response, text_response]
    mock_get_model.return_value = mock_llm

    exec_service = ExecutionService(db, agent, session)
    result = exec_service.execute("List pyramids")

    # Check session messages include tool_call and tool_result
    from services.session_service import get_session
    updated = get_session(db, session["id"])
    roles = [m["role"] for m in updated["messages"]]
    assert "tool_call" in roles
    assert "tool_result" in roles


@patch("services.execution_service.get_chat_model")
def test_max_iterations_safety(mock_get_model):
    """Execution stops after MAX_TOOL_ITERATIONS."""
    db = _make_db()
    session = _make_session_with_user_msg(db)
    agent = _gm_agent()

    # LLM always returns tool calls, never text
    tool_response = MagicMock()
    tool_response.content = ""
    tool_response.tool_calls = [{"name": "pyramids.list", "args": {}, "id": "c"}]

    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.invoke.return_value = tool_response
    mock_get_model.return_value = mock_llm

    exec_service = ExecutionService(db, agent, session)
    result = exec_service.execute("infinite loop")

    assert len(result["tool_calls"]) == ExecutionService.MAX_TOOL_ITERATIONS
    assert "maximum" in result["response"].lower()


@patch("services.execution_service.get_chat_model")
def test_agent_no_tools_still_works(mock_get_model):
    """Agent with no tool access still works as plain chat."""
    mock_llm = MagicMock()
    mock_response = MagicMock()
    mock_response.content = "I'm a simple bot."
    mock_response.tool_calls = []
    mock_llm.invoke.return_value = mock_response
    mock_get_model.return_value = mock_llm

    db = _make_db()
    agent = _custom_agent_no_access()
    session = _make_session_with_user_msg(db, agent["id"])

    exec_service = ExecutionService(db, agent, session)
    result = exec_service.execute("Hello")

    assert result["response"] == "I'm a simple bot."
    # bind_tools should not be called since no tools
    mock_llm.bind_tools.assert_not_called()


@patch("services.execution_service.get_chat_model")
def test_tool_creates_document(mock_get_model):
    """Tool actually creates a Firestore document."""
    db = _make_db()
    session = _make_session_with_user_msg(db)
    agent = _gm_agent()

    tool_call_response = MagicMock()
    tool_call_response.content = ""
    tool_call_response.tool_calls = [{
        "name": "pyramids.create",
        "args": {"title": "My Pyramid"},
        "id": "c1",
    }]

    text_response = MagicMock()
    text_response.content = "Created!"
    text_response.tool_calls = []

    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.invoke.side_effect = [tool_call_response, text_response]
    mock_get_model.return_value = mock_llm

    exec_service = ExecutionService(db, agent, session)
    result = exec_service.execute("Create a pyramid called My Pyramid")

    assert result["tool_calls"][0]["result"]["success"] is True
    # Verify the pyramid was actually created in mock Firestore
    pyramids = db._collections["pyramids"]
    assert len(pyramids) == 1
    doc = list(pyramids.values())[0]
    assert doc["title"] == "My Pyramid"
    assert doc["workspaceId"] == "ws-1"
