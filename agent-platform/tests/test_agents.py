"""Tests for agent CRUD endpoints."""

from tests.conftest import TEST_FIREBASE_UID


def _setup_workspace_and_agent(client):
    """Helper: set up workspace so GM agent exists."""
    resp = client.post(
        "/workspaces/setup",
        json={"workspace_id": "test-workspace-id", "name": "Test"},
    )
    assert resp.status_code == 201
    return resp.json()["gm_agent_id"]


def test_list_agents(client):
    gm_id = _setup_workspace_and_agent(client)
    resp = client.get("/agents", params={"workspace_id": "test-workspace-id"})
    assert resp.status_code == 200
    agents = resp.json()
    assert len(agents) >= 1
    gm = next(a for a in agents if a["id"] == gm_id)
    assert gm["type"] == "gm"
    assert gm["is_default"] is True


def test_get_agent(client):
    gm_id = _setup_workspace_and_agent(client)
    resp = client.get(f"/agents/{gm_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == gm_id
    assert data["name"] == "Jeana"
    assert data["position"] == "General Manager"
    assert data["color"] == "#a855f7"


def test_create_custom_agent(client):
    _setup_workspace_and_agent(client)
    resp = client.post("/agents", json={
        "workspace_id": "test-workspace-id",
        "name": "My Custom Agent",
        "type": "custom",
        "model_mode": "auto",
        "context": "You are a coding assistant.",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Custom Agent"
    assert data["type"] == "custom"
    assert data["is_default"] is False

    # Should now appear in list
    list_resp = client.get("/agents", params={"workspace_id": "test-workspace-id"})
    assert len(list_resp.json()) == 2


def test_update_agent(client):
    gm_id = _setup_workspace_and_agent(client)
    resp = client.put(f"/agents/{gm_id}", json={
        "name": "Updated GM",
        "context": "New system prompt",
        "model_mode": "manual",
        "model_provider": "openai",
        "model_name": "gpt-4.1-mini",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated GM"
    assert data["context"] == "New system prompt"
    assert data["model_mode"] == "manual"
    assert data["model_provider"] == "openai"


def test_delete_default_agent_fails(client):
    gm_id = _setup_workspace_and_agent(client)
    resp = client.delete(f"/agents/{gm_id}")
    assert resp.status_code == 409
    body = resp.json()
    assert body["ok"] is False
    assert "default" in body["error"]["message"].lower()


def test_delete_custom_agent(client):
    _setup_workspace_and_agent(client)
    # Create a custom agent
    create_resp = client.post("/agents", json={
        "workspace_id": "test-workspace-id",
        "name": "Temp Agent",
    })
    assert create_resp.status_code == 201
    agent_id = create_resp.json()["id"]

    # Delete it
    del_resp = client.delete(f"/agents/{agent_id}")
    assert del_resp.status_code == 204

    # Should be gone
    get_resp = client.get(f"/agents/{agent_id}")
    assert get_resp.status_code == 404


def test_get_nonexistent_agent(client):
    resp = client.get("/agents/nonexistent-id")
    assert resp.status_code == 404
