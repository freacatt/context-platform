"""UI/UX Architectures app tool registration."""

from tools.base import AppDefinition, ToolDefinition, ToolAction
from tools.handlers import make_crud_handlers


def register_ui_ux_architectures(registry):
    handlers = make_crud_handlers(
        collection_name="uiUxArchitectures",
        app_id="ui_ux_architectures",
        create_defaults={"pages": {}, "themes": {}, "components": {}, "contextSources": []},
        updatable_fields={"title", "pages", "themes", "components", "contextSources"},
    )

    app_def = AppDefinition(
        app_id="ui_ux_architectures",
        name="UI/UX Architectures",
        firestore_collection="uiUxArchitectures",
        description=(
            "UI/UX Architectures documents the user interface design of applications. "
            "Contains pages (screen definitions), themes (visual styling), and components "
            "(reusable UI elements). Each section is a Record of named items with descriptions."
        ),
        data_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "UI/UX architecture title"},
                "pages": {"type": "object", "description": "Record<pageId, {name, description, layout, components[]}>"},
                "themes": {"type": "object", "description": "Record<themeId, {name, description, colors, typography}>"},
                "components": {"type": "object", "description": "Record<componentId, {name, description, props, variants}>"},
                "contextSources": {"type": "array", "description": "References to related documents"},
            },
        },
        available_actions=["create", "read", "update", "delete", "list"],
        usage_guidelines="Use UI/UX architectures to document interface designs. Add pages for new screens, themes for visual styles, components for reusable elements. Read to understand existing UI patterns before designing new ones.",
        example_prompts=["Create a UI architecture for the dashboard", "Add a login page to the UI architecture", "Update the theme colors", "List all UI/UX architectures"],
        tools=[
            ToolDefinition(tool_id="ui_ux_architectures.create", app_id="ui_ux_architectures", action=ToolAction.CREATE, name="Create UI/UX Architecture", description="Creates a new UI/UX architecture document", parameters={"type": "object", "properties": {"title": {"type": "string", "description": "Architecture title"}}, "required": ["title"]}, handler=handlers["create"]),
            ToolDefinition(tool_id="ui_ux_architectures.read", app_id="ui_ux_architectures", action=ToolAction.READ, name="Read UI/UX Architecture", description="Reads a UI/UX architecture by ID", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}}, "required": ["id"]}, handler=handlers["read"]),
            ToolDefinition(tool_id="ui_ux_architectures.update", app_id="ui_ux_architectures", action=ToolAction.UPDATE, name="Update UI/UX Architecture", description="Updates pages, themes, or components of a UI/UX architecture", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}, "title": {"type": "string"}, "pages": {"type": "object"}, "themes": {"type": "object"}, "components": {"type": "object"}}, "required": ["id"]}, handler=handlers["update"]),
            ToolDefinition(tool_id="ui_ux_architectures.delete", app_id="ui_ux_architectures", action=ToolAction.DELETE, name="Delete UI/UX Architecture", description="Deletes a UI/UX architecture document", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}}, "required": ["id"]}, handler=handlers["delete"]),
            ToolDefinition(tool_id="ui_ux_architectures.list", app_id="ui_ux_architectures", action=ToolAction.LIST, name="List UI/UX Architectures", description="Lists all UI/UX architectures in the workspace", parameters={"type": "object", "properties": {}}, handler=handlers["list"]),
        ],
    )
    registry.register_app(app_def)
