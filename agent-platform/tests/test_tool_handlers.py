"""Tests for generic CRUD tool handlers."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from tests.conftest import MockFirestoreClient
from tools.handlers import make_crud_handlers


def _make_db():
    return MockFirestoreClient()


def test_create_handler():
    db = _make_db()
    handlers = make_crud_handlers("testCollection", "test_app")
    result = handlers["create"](db, "ws-1", "user-1", {"title": "My Doc"})
    assert result["success"] is True
    assert result["id"]
    assert result["document"]["title"] == "My Doc"
    assert result["document"]["workspaceId"] == "ws-1"
    assert result["document"]["userId"] == "user-1"


def test_read_handler():
    db = _make_db()
    handlers = make_crud_handlers("testCollection", "test_app")
    created = handlers["create"](db, "ws-1", "user-1", {"title": "Read Me"})
    result = handlers["read"](db, "ws-1", "user-1", {"id": created["id"]})
    assert result["success"] is True
    assert result["document"]["title"] == "Read Me"


def test_read_handler_not_found():
    db = _make_db()
    handlers = make_crud_handlers("testCollection", "test_app")
    result = handlers["read"](db, "ws-1", "user-1", {"id": "nonexistent"})
    assert result["success"] is False
    assert "not found" in result["error"]


def test_read_handler_wrong_workspace():
    db = _make_db()
    handlers = make_crud_handlers("testCollection", "test_app")
    created = handlers["create"](db, "ws-1", "user-1", {"title": "Mine"})
    result = handlers["read"](db, "ws-other", "user-1", {"id": created["id"]})
    assert result["success"] is False
    assert "workspace" in result["error"].lower()


def test_update_handler():
    db = _make_db()
    handlers = make_crud_handlers("testCollection", "test_app", updatable_fields={"title", "status"})
    created = handlers["create"](db, "ws-1", "user-1", {"title": "Old"})
    result = handlers["update"](db, "ws-1", "user-1", {"id": created["id"], "title": "New", "hacked": "no"})
    assert result["success"] is True
    assert "title" in result["updated_fields"]
    assert "hacked" not in result["updated_fields"]


def test_delete_handler():
    db = _make_db()
    handlers = make_crud_handlers("testCollection", "test_app")
    created = handlers["create"](db, "ws-1", "user-1", {"title": "Delete Me"})
    result = handlers["delete"](db, "ws-1", "user-1", {"id": created["id"]})
    assert result["success"] is True
    read_result = handlers["read"](db, "ws-1", "user-1", {"id": created["id"]})
    assert read_result["success"] is False


def test_list_handler():
    db = _make_db()
    handlers = make_crud_handlers("testCollection", "test_app")
    handlers["create"](db, "ws-1", "user-1", {"title": "Doc 1"})
    handlers["create"](db, "ws-1", "user-1", {"title": "Doc 2"})
    handlers["create"](db, "ws-other", "user-1", {"title": "Other WS"})
    result = handlers["list"](db, "ws-1", "user-1", {})
    assert result["success"] is True
    assert result["count"] == 2


def test_list_handler_empty():
    db = _make_db()
    handlers = make_crud_handlers("testCollection", "test_app")
    result = handlers["list"](db, "ws-1", "user-1", {})
    assert result["success"] is True
    assert result["count"] == 0
    assert result["documents"] == []


def test_create_with_defaults():
    db = _make_db()
    handlers = make_crud_handlers(
        "testCollection", "test_app",
        create_defaults={"status": "active", "tags": []},
    )
    result = handlers["create"](db, "ws-1", "user-1", {"title": "With Defaults"})
    assert result["document"]["status"] == "active"
    assert result["document"]["tags"] == []


def test_missing_id_returns_error():
    db = _make_db()
    handlers = make_crud_handlers("testCollection", "test_app")
    assert handlers["read"](db, "ws-1", "user-1", {})["success"] is False
    assert handlers["update"](db, "ws-1", "user-1", {"title": "x"})["success"] is False
    assert handlers["delete"](db, "ws-1", "user-1", {})["success"] is False
