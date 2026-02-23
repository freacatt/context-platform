"""Tests for the tool registry."""

import pytest
import tools.registry as registry_mod
from tools.registry import get_tool_registry


@pytest.fixture(autouse=True)
def reset_registry():
    """Reset singleton for each test."""
    registry_mod._registry = None
    yield
    registry_mod._registry = None


def test_registry_has_all_apps():
    registry = get_tool_registry()
    apps = registry.list_apps()
    app_ids = {a.app_id for a in apps}
    expected = {
        "pyramids", "product_definitions", "technical_architectures",
        "technical_tasks", "diagrams", "ui_ux_architectures",
        "context_documents", "pipelines",
    }
    assert app_ids == expected


def test_registry_has_5_tools_per_app():
    registry = get_tool_registry()
    for app in registry.list_apps():
        tools = registry.list_tools(app_id=app.app_id)
        assert len(tools) == 5, f"{app.app_id} should have 5 tools, got {len(tools)}"


def test_total_tool_count():
    registry = get_tool_registry()
    assert len(registry.list_tools()) == 40  # 8 apps * 5 tools


def test_tool_id_format():
    registry = get_tool_registry()
    for tool in registry.list_tools():
        assert "." in tool.tool_id
        parts = tool.tool_id.split(".")
        assert len(parts) == 2
        assert parts[0] == tool.app_id
        assert parts[1] in {"create", "read", "update", "delete", "list"}


def test_get_tool():
    registry = get_tool_registry()
    tool = registry.get_tool("pyramids.create")
    assert tool is not None
    assert tool.app_id == "pyramids"
    assert tool.name == "Create Pyramid"


def test_get_tool_not_found():
    registry = get_tool_registry()
    assert registry.get_tool("nonexistent.tool") is None


def test_get_app():
    registry = get_tool_registry()
    app = registry.get_app("product_definitions")
    assert app is not None
    assert app.name == "Product Definitions"
    assert app.firestore_collection == "productDefinitions"


def test_get_app_not_found():
    registry = get_tool_registry()
    assert registry.get_app("nonexistent") is None


def test_get_tools_for_apps():
    registry = get_tool_registry()
    tools = registry.get_tools_for_apps(["pyramids", "diagrams"])
    assert len(tools) == 10
    app_ids = {t.app_id for t in tools}
    assert app_ids == {"pyramids", "diagrams"}


def test_app_definitions_have_descriptions():
    registry = get_tool_registry()
    for app in registry.list_apps():
        assert app.description, f"{app.app_id} missing description"
        assert app.usage_guidelines, f"{app.app_id} missing usage_guidelines"
        assert app.example_prompts, f"{app.app_id} missing example_prompts"
        assert app.data_schema, f"{app.app_id} missing data_schema"


def test_collection_name_mapping():
    registry = get_tool_registry()
    expected = {
        "pyramids": "pyramids",
        "product_definitions": "productDefinitions",
        "technical_architectures": "technicalArchitectures",
        "technical_tasks": "technicalTasks",
        "diagrams": "diagrams",
        "ui_ux_architectures": "uiUxArchitectures",
        "context_documents": "contextDocuments",
        "pipelines": "pipelines",
    }
    for app_id, collection in expected.items():
        app = registry.get_app(app_id)
        assert app.firestore_collection == collection
