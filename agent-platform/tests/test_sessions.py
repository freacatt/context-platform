"""Tests for session endpoints."""

from unittest.mock import patch, MagicMock


def test_create_session(client, seeded_firestore):
    # Create an agent first
    agent_resp = client.post("/agents", json={
        "workspace_id": "test-workspace-id",
        "name": "Test Agent",
        "type": "custom",
    })
    agent_id = agent_resp.json()["id"]

    resp = client.post("/sessions", json={
        "workspace_id": "test-workspace-id",
        "agent_id": agent_id,
        "title": "Test Session",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["workspace_id"] == "test-workspace-id"
    assert data["agent_id"] == agent_id
    assert data["title"] == "Test Session"
    assert data["status"] == "active"
    assert data["messages"] == []


def test_create_session_validates_workspace(client):
    resp = client.post("/sessions", json={
        "workspace_id": "nonexistent",
        "agent_id": "whatever",
    })
    assert resp.status_code == 404


def test_create_session_validates_agent_workspace(client, seeded_firestore):
    # Create agent in a different workspace
    seeded_firestore._collections["workspaces"]["other-ws"] = {
        "userId": "test-user-uid-123",
        "name": "Other",
    }
    agent_resp = client.post("/agents", json={
        "workspace_id": "other-ws",
        "name": "Other Agent",
    })
    agent_id = agent_resp.json()["id"]

    resp = client.post("/sessions", json={
        "workspace_id": "test-workspace-id",
        "agent_id": agent_id,
    })
    assert resp.status_code == 403


def test_list_sessions(client, seeded_firestore):
    agent_resp = client.post("/agents", json={
        "workspace_id": "test-workspace-id",
        "name": "Agent",
    })
    agent_id = agent_resp.json()["id"]

    # Create two sessions
    client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id, "title": "Session 1"})
    client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id, "title": "Session 2"})

    resp = client.get("/sessions", params={"workspace_id": "test-workspace-id"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


def test_list_sessions_filter_by_agent(client, seeded_firestore):
    a1 = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A1"}).json()["id"]
    a2 = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A2"}).json()["id"]

    client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": a1})
    client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": a2})

    resp = client.get("/sessions", params={"workspace_id": "test-workspace-id", "agent_id": a1})
    assert len(resp.json()) == 1


def test_list_sessions_filter_by_status(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    s1 = client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id}).json()["id"]
    client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id})

    # Pause one
    client.patch(f"/sessions/{s1}", json={"status": "paused"})

    resp = client.get("/sessions", params={"workspace_id": "test-workspace-id", "status": "active"})
    assert len(resp.json()) == 1


def test_get_session(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={
        "workspace_id": "test-workspace-id",
        "agent_id": agent_id,
        "title": "My Session",
    }).json()["id"]

    resp = client.get(f"/sessions/{session_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "My Session"


def test_get_session_not_found(client):
    resp = client.get("/sessions/nonexistent")
    assert resp.status_code == 404


@patch("api.sessions.ChatService")
def test_send_message(mock_chat_cls, client, seeded_firestore):
    mock_chat = MagicMock()
    mock_chat.chat.return_value = ("Hello! I can help with that.", "claude-3-5-sonnet")
    mock_chat_cls.return_value = mock_chat

    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id}).json()["id"]

    resp = client.post(f"/sessions/{session_id}/messages", json={"message": "Hello agent"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_message"]["content"] == "Hello agent"
    assert data["assistant_message"]["content"] == "Hello! I can help with that."
    assert data["model"] == "claude-3-5-sonnet"

    # Verify messages stored in session
    session = client.get(f"/sessions/{session_id}").json()
    assert len(session["messages"]) == 2
    assert session["messages"][0]["role"] == "user"
    assert session["messages"][1]["role"] == "assistant"


@patch("api.sessions.ChatService")
def test_send_message_generates_title(mock_chat_cls, client, seeded_firestore):
    mock_chat = MagicMock()
    mock_chat.chat.return_value = ("Response", "model")
    mock_chat_cls.return_value = mock_chat

    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id}).json()["id"]

    client.post(f"/sessions/{session_id}/messages", json={"message": "Help me brainstorm"})

    session = client.get(f"/sessions/{session_id}").json()
    assert session["title"] == "Help me brainstorm"


def test_send_message_paused_session(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id}).json()["id"]

    client.patch(f"/sessions/{session_id}", json={"status": "paused"})

    resp = client.post(f"/sessions/{session_id}/messages", json={"message": "Hello"})
    assert resp.status_code == 400
    assert "SESSION_NOT_ACTIVE" in resp.json()["error"]["code"]


def test_pause_session(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id}).json()["id"]

    resp = client.patch(f"/sessions/{session_id}", json={"status": "paused"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "paused"


def test_complete_session(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id}).json()["id"]

    resp = client.patch(f"/sessions/{session_id}", json={"status": "completed"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


def test_completed_session_cannot_reactivate(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id}).json()["id"]

    client.patch(f"/sessions/{session_id}", json={"status": "completed"})
    resp = client.patch(f"/sessions/{session_id}", json={"status": "active"})
    assert resp.status_code == 400
    assert "INVALID_STATUS_TRANSITION" in resp.json()["error"]["code"]


def test_invalid_status(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id}).json()["id"]

    resp = client.patch(f"/sessions/{session_id}", json={"status": "invalid"})
    assert resp.status_code == 400
    assert "INVALID_STATUS" in resp.json()["error"]["code"]


def test_delete_session(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={"workspace_id": "test-workspace-id", "agent_id": agent_id}).json()["id"]

    resp = client.delete(f"/sessions/{session_id}")
    assert resp.status_code == 204

    # Verify session is gone
    resp = client.get(f"/sessions/{session_id}")
    assert resp.status_code == 404


def test_delete_session_not_found(client):
    resp = client.delete("/sessions/nonexistent")
    assert resp.status_code == 404


def test_create_session_chat_only(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]

    resp = client.post("/sessions", json={
        "workspace_id": "test-workspace-id",
        "agent_id": agent_id,
        "chat_only": True,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["metadata"]["chatOnly"] is True


def test_create_session_default_not_chat_only(client, seeded_firestore):
    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]

    resp = client.post("/sessions", json={
        "workspace_id": "test-workspace-id",
        "agent_id": agent_id,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["metadata"].get("chatOnly") is None or data["metadata"].get("chatOnly") is False


@patch("api.sessions.ChatService")
@patch("api.sessions.get_agent_tools")
def test_send_message_chat_only_skips_tools(mock_get_tools, mock_chat_cls, client, seeded_firestore):
    """Even if agent has tools, chat_only session should use ChatService."""
    mock_chat = MagicMock()
    mock_chat.chat.return_value = ("Just chatting!", "gpt-4o")
    mock_chat_cls.return_value = mock_chat

    # Return tools — normally this would trigger ExecutionService
    mock_get_tools.return_value = [MagicMock()]

    agent_id = client.post("/agents", json={"workspace_id": "test-workspace-id", "name": "A"}).json()["id"]
    session_id = client.post("/sessions", json={
        "workspace_id": "test-workspace-id",
        "agent_id": agent_id,
        "chat_only": True,
    }).json()["id"]

    resp = client.post(f"/sessions/{session_id}/messages", json={"message": "Hello"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["assistant_message"]["content"] == "Just chatting!"
    assert data["tool_calls"] == []
    # Verify ChatService was used (not ExecutionService)
    mock_chat.chat.assert_called_once()
