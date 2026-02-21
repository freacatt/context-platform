"""Tests for the chat endpoint."""

from unittest.mock import patch, MagicMock

from tests.conftest import TEST_FIREBASE_UID


def _setup(client):
    resp = client.post(
        "/workspaces/setup",
        json={"workspace_id": "test-workspace-id", "name": "Test"},
    )
    return resp.json()["gm_agent_id"]


def test_chat_success(client):
    gm_id = _setup(client)

    mock_response = MagicMock()
    mock_response.content = "Hello! I can help with that."

    with patch("services.chat_service.get_chat_model") as mock_get_model:
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = mock_response
        mock_get_model.return_value = mock_llm

        resp = client.post("/chat", json={
            "workspace_id": "test-workspace-id",
            "agent_id": gm_id,
            "message": "Help me with my project",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["response"] == "Hello! I can help with that."
    assert data["agent_id"] == gm_id
    assert "model" in data


def test_chat_with_history(client):
    gm_id = _setup(client)

    mock_response = MagicMock()
    mock_response.content = "Based on our conversation..."

    with patch("services.chat_service.get_chat_model") as mock_get_model:
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = mock_response
        mock_get_model.return_value = mock_llm

        resp = client.post("/chat", json={
            "workspace_id": "test-workspace-id",
            "agent_id": gm_id,
            "message": "What did I ask before?",
            "history": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"},
            ],
        })

    assert resp.status_code == 200
    # Verify history was passed to LLM
    call_args = mock_llm.invoke.call_args[0][0]
    assert len(call_args) >= 3  # system + history(2) + current


def test_chat_with_context(client):
    gm_id = _setup(client)

    mock_response = MagicMock()
    mock_response.content = "Using the provided context..."

    with patch("services.chat_service.get_chat_model") as mock_get_model:
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = mock_response
        mock_get_model.return_value = mock_llm

        resp = client.post("/chat", json={
            "workspace_id": "test-workspace-id",
            "agent_id": gm_id,
            "message": "Analyze this",
            "context": "Project uses React and FastAPI",
        })

    assert resp.status_code == 200


def test_chat_nonexistent_agent(client):
    resp = client.post("/chat", json={
        "workspace_id": "test-workspace-id",
        "agent_id": "nonexistent-agent",
        "message": "Hello",
    })
    assert resp.status_code == 404


def test_chat_agent_workspace_mismatch(client, seeded_firestore):
    gm_id = _setup(client)

    # Create another workspace
    seeded_firestore._collections["workspaces"]["other-ws"] = {
        "userId": TEST_FIREBASE_UID,
        "name": "Other",
    }

    resp = client.post("/chat", json={
        "workspace_id": "other-ws",
        "agent_id": gm_id,
        "message": "Hello",
    })
    assert resp.status_code == 403
    body = resp.json()
    assert "MISMATCH" in body["error"]["code"]


def test_chat_llm_failure(client):
    gm_id = _setup(client)

    with patch("services.chat_service.get_chat_model") as mock_get_model:
        mock_llm = MagicMock()
        mock_llm.invoke.side_effect = Exception("LLM provider down")
        mock_get_model.return_value = mock_llm

        resp = client.post("/chat", json={
            "workspace_id": "test-workspace-id",
            "agent_id": gm_id,
            "message": "Hello",
        })

    assert resp.status_code == 502
    body = resp.json()
    assert body["ok"] is False
    assert body["error"]["code"] == "LLM_ERROR"
