"""Tests for the recommend endpoint."""

from unittest.mock import patch, MagicMock

from tests.conftest import TEST_FIREBASE_UID


def _setup(client):
    resp = client.post(
        "/workspaces/setup",
        json={"workspace_id": "test-workspace-id", "name": "Test"},
    )
    return resp.json()["gm_agent_id"]


def test_recommend_success(client):
    gm_id = _setup(client)

    mock_response = MagicMock()
    mock_response.content = "Suggested answer line 1\nLine 2\nLine 3"

    with patch("services.chat_service.get_chat_model") as mock_get_model:
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = mock_response
        mock_get_model.return_value = mock_llm

        resp = client.post("/recommend", json={
            "workspace_id": "test-workspace-id",
            "agent_id": gm_id,
            "prompt_type": "pyramid_answer",
            "variables": {
                "pyramid_context": "Test context",
                "global_context": "Global",
                "history_context": "",
                "question": "What is the root cause?",
            },
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["response"] == "Suggested answer line 1\nLine 2\nLine 3"
    assert data["prompt_type"] == "pyramid_answer"
    assert "model" in data


def test_recommend_invalid_prompt_type(client):
    gm_id = _setup(client)

    resp = client.post("/recommend", json={
        "workspace_id": "test-workspace-id",
        "agent_id": gm_id,
        "prompt_type": "nonexistent_type",
        "variables": {},
    })

    assert resp.status_code == 400
    body = resp.json()
    assert body["error"]["code"] == "INVALID_PROMPT_TYPE"


def test_recommend_agent_workspace_mismatch(client, seeded_firestore):
    gm_id = _setup(client)

    seeded_firestore._collections["workspaces"]["other-ws"] = {
        "userId": TEST_FIREBASE_UID,
        "name": "Other",
    }

    resp = client.post("/recommend", json={
        "workspace_id": "other-ws",
        "agent_id": gm_id,
        "prompt_type": "pyramid_answer",
        "variables": {},
    })

    assert resp.status_code == 400
    body = resp.json()
    assert "MISMATCH" in body["error"]["code"]


def test_list_prompt_types(client):
    resp = client.get("/recommend/prompt-types")
    assert resp.status_code == 200
    types = resp.json()
    assert isinstance(types, list)
    assert "pyramid_answer" in types
    assert "pyramid_combined_question" in types
    assert "pyramid_followup_question" in types
    assert "product_definition_topic" in types
    assert "technical_task_field" in types
    assert "technical_architecture_field" in types
    assert "diagram_block_description" in types
    assert "uiux_page_description" in types
    assert "uiux_theme_description" in types
    assert "uiux_component_description" in types


def test_recommend_missing_variables_uses_defaults(client):
    """Missing template variables should be replaced with empty strings."""
    gm_id = _setup(client)

    mock_response = MagicMock()
    mock_response.content = "AI suggestion"

    with patch("services.chat_service.get_chat_model") as mock_get_model:
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = mock_response
        mock_get_model.return_value = mock_llm

        resp = client.post("/recommend", json={
            "workspace_id": "test-workspace-id",
            "agent_id": gm_id,
            "prompt_type": "pyramid_answer",
            "variables": {},  # no variables — all should default to ""
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["response"] == "AI suggestion"
