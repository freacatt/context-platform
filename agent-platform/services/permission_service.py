"""Permission resolution — maps agent config to allowed tools."""

from tools.base import AppDefinition, ToolDefinition
from tools.registry import get_tool_registry


def get_agent_tools(agent_data: dict) -> list[ToolDefinition]:
    """Get all tools an agent is allowed to use, based on its appAccess."""
    registry = get_tool_registry()
    app_access = agent_data.get("appAccess", [])

    # GM with no explicit appAccess gets everything
    if agent_data.get("type") == "gm" and not app_access:
        return registry.list_tools()

    tools = []
    for access in app_access:
        app_id = access["appId"]
        permissions = set(access.get("permissions", []))
        app_tools = registry.list_tools(app_id=app_id)
        for tool in app_tools:
            if tool.action.value in permissions:
                tools.append(tool)
    return tools


def can_execute(agent_data: dict, tool_id: str) -> bool:
    """Check if an agent has permission to execute a specific tool."""
    allowed_tools = get_agent_tools(agent_data)
    return any(t.tool_id == tool_id for t in allowed_tools)


def get_agent_app_definitions(agent_data: dict) -> list[AppDefinition]:
    """Get AppDefinitions for all apps an agent has access to.

    Used to build the agent's system prompt context for onboarding.
    """
    registry = get_tool_registry()
    app_access = agent_data.get("appAccess", [])

    if agent_data.get("type") == "gm" and not app_access:
        return registry.list_apps()

    app_ids = [a["appId"] for a in app_access]
    return [app for aid in app_ids if (app := registry.get_app(aid)) is not None]
