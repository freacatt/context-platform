"""Central tool registry — singleton that holds all app definitions and tools."""

from tools.base import AppDefinition, ToolDefinition


class ToolRegistry:
    """Central registry of all app definitions and their tools."""

    def __init__(self):
        self._apps: dict[str, AppDefinition] = {}
        self._tools: dict[str, ToolDefinition] = {}

    def register_app(self, app_def: AppDefinition) -> None:
        self._apps[app_def.app_id] = app_def
        for tool in app_def.tools:
            self._tools[tool.tool_id] = tool

    def get_app(self, app_id: str) -> AppDefinition | None:
        return self._apps.get(app_id)

    def get_tool(self, tool_id: str) -> ToolDefinition | None:
        return self._tools.get(tool_id)

    def list_apps(self) -> list[AppDefinition]:
        return list(self._apps.values())

    def list_tools(self, app_id: str | None = None) -> list[ToolDefinition]:
        if app_id:
            return [t for t in self._tools.values() if t.app_id == app_id]
        return list(self._tools.values())

    def get_tools_for_apps(self, app_ids: list[str]) -> list[ToolDefinition]:
        return [t for t in self._tools.values() if t.app_id in app_ids]


_registry: ToolRegistry | None = None


def get_tool_registry() -> ToolRegistry:
    global _registry
    if _registry is None:
        _registry = ToolRegistry()
        _register_all_apps(_registry)
    return _registry


def _register_all_apps(registry: ToolRegistry) -> None:
    from tools.apps.pyramids import register_pyramids
    from tools.apps.product_definitions import register_product_definitions
    from tools.apps.technical_architectures import register_technical_architectures
    from tools.apps.technical_tasks import register_technical_tasks
    from tools.apps.diagrams import register_diagrams
    from tools.apps.ui_ux_architectures import register_ui_ux_architectures
    from tools.apps.context_documents import register_context_documents
    from tools.apps.pipelines import register_pipelines

    register_pyramids(registry)
    register_product_definitions(registry)
    register_technical_architectures(registry)
    register_technical_tasks(registry)
    register_diagrams(registry)
    register_ui_ux_architectures(registry)
    register_context_documents(registry)
    register_pipelines(registry)
