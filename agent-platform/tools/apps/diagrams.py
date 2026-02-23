"""Diagrams app tool registration."""

from tools.base import AppDefinition, ToolDefinition, ToolAction
from tools.handlers import make_crud_handlers


def register_diagrams(registry):
    handlers = make_crud_handlers(
        collection_name="diagrams",
        app_id="diagrams",
        create_defaults={"content": "", "diagramType": "mermaid", "contextSources": []},
        updatable_fields={"title", "content", "diagramType", "contextSources"},
    )

    app_def = AppDefinition(
        app_id="diagrams",
        name="Diagrams",
        firestore_collection="diagrams",
        description=(
            "Diagrams stores visual diagrams for architecture and flow documentation. "
            "Each diagram has a type (mermaid, flowchart, etc.) and content "
            "(typically Mermaid syntax or similar). Used for visualizing system flows, "
            "data models, and architectural relationships."
        ),
        data_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Diagram title"},
                "content": {"type": "string", "description": "Diagram content (e.g. Mermaid syntax)"},
                "diagramType": {"type": "string", "description": "Type of diagram: mermaid, flowchart, etc."},
                "contextSources": {"type": "array", "description": "References to related documents"},
            },
        },
        available_actions=["create", "read", "update", "delete", "list"],
        usage_guidelines="Use diagrams to create visual representations of systems, flows, or data models. Content is typically Mermaid syntax. Update content when architecture changes.",
        example_prompts=["Create a sequence diagram for the login flow", "List all diagrams", "Update the architecture diagram with the new service", "Show me the data flow diagram"],
        tools=[
            ToolDefinition(tool_id="diagrams.create", app_id="diagrams", action=ToolAction.CREATE, name="Create Diagram", description="Creates a new diagram", parameters={"type": "object", "properties": {"title": {"type": "string", "description": "Diagram title"}, "content": {"type": "string", "description": "Diagram content (Mermaid syntax)"}, "diagramType": {"type": "string", "description": "Diagram type"}}, "required": ["title"]}, handler=handlers["create"]),
            ToolDefinition(tool_id="diagrams.read", app_id="diagrams", action=ToolAction.READ, name="Read Diagram", description="Reads a diagram by ID", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Diagram ID"}}, "required": ["id"]}, handler=handlers["read"]),
            ToolDefinition(tool_id="diagrams.update", app_id="diagrams", action=ToolAction.UPDATE, name="Update Diagram", description="Updates a diagram's title, content, or type", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Diagram ID"}, "title": {"type": "string"}, "content": {"type": "string"}, "diagramType": {"type": "string"}}, "required": ["id"]}, handler=handlers["update"]),
            ToolDefinition(tool_id="diagrams.delete", app_id="diagrams", action=ToolAction.DELETE, name="Delete Diagram", description="Deletes a diagram", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Diagram ID"}}, "required": ["id"]}, handler=handlers["delete"]),
            ToolDefinition(tool_id="diagrams.list", app_id="diagrams", action=ToolAction.LIST, name="List Diagrams", description="Lists all diagrams in the workspace", parameters={"type": "object", "properties": {}}, handler=handlers["list"]),
        ],
    )
    registry.register_app(app_def)
