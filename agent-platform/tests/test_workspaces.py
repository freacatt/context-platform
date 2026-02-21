"""Tests for workspace setup endpoint."""

from unittest.mock import patch

from tests.conftest import TEST_FIREBASE_UID


def test_setup_workspace_success(client, seeded_firestore, mock_qdrant):
    resp = client.post(
        "/workspaces/setup",
        json={"workspace_id": "test-workspace-id", "name": "Test Workspace"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["workspace_id"] == "test-workspace-id"
    assert data["gm_agent_id"]

    # Qdrant collection should have been created
    collections = mock_qdrant.get_collections()
    names = [c.name for c in collections.collections]
    assert "workspace_test-workspace-id" in names

    # Agent should exist in Firestore
    agent_id = data["gm_agent_id"]
    agent_doc = seeded_firestore.collection("agents").document(agent_id).get()
    assert agent_doc.exists
    agent_data = agent_doc.to_dict()
    assert agent_data["type"] == "gm"
    assert agent_data["isDefault"] is True
    assert agent_data["workspaceId"] == "test-workspace-id"

    # Workspace should be updated with gmAgentId
    ws_doc = seeded_firestore.collection("workspaces").document("test-workspace-id").get()
    ws_data = ws_doc.to_dict()
    assert ws_data["gmAgentId"] == agent_id


def test_setup_workspace_not_found(client):
    resp = client.post(
        "/workspaces/setup",
        json={"workspace_id": "nonexistent", "name": "Nope"},
    )
    assert resp.status_code == 404
    body = resp.json()
    assert body["ok"] is False
    assert "NOT_FOUND" in body["error"]["code"]


def test_setup_workspace_wrong_owner(client, seeded_firestore):
    # Change workspace owner to someone else
    seeded_firestore._collections["workspaces"]["test-workspace-id"]["userId"] = "other-user"
    resp = client.post(
        "/workspaces/setup",
        json={"workspace_id": "test-workspace-id", "name": "Test"},
    )
    assert resp.status_code == 403


def test_get_workspace(client, seeded_firestore):
    # First set up workspace so it has gmAgentId
    setup_resp = client.post(
        "/workspaces/setup",
        json={"workspace_id": "test-workspace-id", "name": "Test Workspace"},
    )
    assert setup_resp.status_code == 201

    resp = client.get("/workspaces/test-workspace-id")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "test-workspace-id"
    assert data["name"] == "Test Workspace"
    assert data["gm_agent_id"] is not None


def test_setup_workspace_rollback_on_agent_failure(client, seeded_firestore, mock_qdrant):
    """If agent creation fails, Qdrant collection should be rolled back."""
    with patch(
        "api.workspaces.agent_service.create_default_gm_agent",
        side_effect=Exception("Firestore write failed"),
    ):
        resp = client.post(
            "/workspaces/setup",
            json={"workspace_id": "test-workspace-id", "name": "Test"},
        )
    assert resp.status_code == 500
    body = resp.json()
    assert body["ok"] is False
    assert body["error"]["code"] == "WORKSPACE_SETUP_FAILED"

    # Qdrant collection should have been rolled back
    collections = mock_qdrant.get_collections()
    names = [c.name for c in collections.collections]
    assert "workspace_test-workspace-id" not in names
