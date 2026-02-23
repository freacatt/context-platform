"""Tests for permission service."""

import pytest
import tools.registry as registry_mod
from services.permission_service import get_agent_tools, can_execute, get_agent_app_definitions


@pytest.fixture(autouse=True)
def reset_registry():
    registry_mod._registry = None
    yield
    registry_mod._registry = None


def test_gm_has_all_tools():
    agent = {"type": "gm", "appAccess": []}
    tools = get_agent_tools(agent)
    assert len(tools) == 40  # 8 apps * 5 tools


def test_custom_agent_no_access():
    agent = {"type": "custom", "appAccess": []}
    tools = get_agent_tools(agent)
    assert len(tools) == 0


def test_custom_agent_specific_access():
    agent = {
        "type": "custom",
        "appAccess": [
            {"appId": "pyramids", "permissions": ["create", "read", "list"]},
        ],
    }
    tools = get_agent_tools(agent)
    assert len(tools) == 3
    tool_ids = {t.tool_id for t in tools}
    assert tool_ids == {"pyramids.create", "pyramids.read", "pyramids.list"}


def test_custom_agent_multi_app_access():
    agent = {
        "type": "custom",
        "appAccess": [
            {"appId": "pyramids", "permissions": ["read"]},
            {"appId": "diagrams", "permissions": ["create", "read"]},
        ],
    }
    tools = get_agent_tools(agent)
    assert len(tools) == 3
    tool_ids = {t.tool_id for t in tools}
    assert tool_ids == {"pyramids.read", "diagrams.create", "diagrams.read"}


def test_can_execute_allowed():
    agent = {
        "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["create"]}],
    }
    assert can_execute(agent, "pyramids.create") is True


def test_can_execute_denied():
    agent = {
        "type": "custom",
        "appAccess": [{"appId": "pyramids", "permissions": ["read"]}],
    }
    assert can_execute(agent, "pyramids.create") is False


def test_can_execute_no_access():
    agent = {"type": "custom", "appAccess": []}
    assert can_execute(agent, "pyramids.create") is False


def test_gm_can_execute_anything():
    agent = {"type": "gm", "appAccess": []}
    assert can_execute(agent, "pyramids.create") is True
    assert can_execute(agent, "product_definitions.delete") is True
    assert can_execute(agent, "diagrams.update") is True


def test_read_only_access_cannot_create():
    agent = {
        "type": "custom",
        "appAccess": [{"appId": "product_definitions", "permissions": ["read", "list"]}],
    }
    assert can_execute(agent, "product_definitions.read") is True
    assert can_execute(agent, "product_definitions.list") is True
    assert can_execute(agent, "product_definitions.create") is False
    assert can_execute(agent, "product_definitions.update") is False
    assert can_execute(agent, "product_definitions.delete") is False


def test_get_agent_app_definitions_gm():
    agent = {"type": "gm", "appAccess": []}
    defs = get_agent_app_definitions(agent)
    assert len(defs) == 8


def test_get_agent_app_definitions_custom():
    agent = {
        "type": "custom",
        "appAccess": [
            {"appId": "pyramids", "permissions": ["read"]},
            {"appId": "diagrams", "permissions": ["read"]},
        ],
    }
    defs = get_agent_app_definitions(agent)
    assert len(defs) == 2
    app_ids = {d.app_id for d in defs}
    assert app_ids == {"pyramids", "diagrams"}


def test_get_agent_app_definitions_empty():
    agent = {"type": "custom", "appAccess": []}
    defs = get_agent_app_definitions(agent)
    assert len(defs) == 0
