"""Technical Architectures app tool registration."""

from tools.base import AppDefinition, ToolDefinition, ToolAction
from tools.handlers import make_crud_handlers


def register_technical_architectures(registry):
    handlers = make_crud_handlers(
        collection_name="technicalArchitectures",
        app_id="technical_architectures",
        create_defaults={"content": {}, "contextSources": []},
        updatable_fields={"title", "content", "contextSources"},
    )

    app_def = AppDefinition(
        app_id="technical_architectures",
        name="Technical Architectures",
        firestore_collection="technicalArchitectures",
        description=(
            "Technical Architectures defines system design documents. Each architecture "
            "has a complex nested content structure with sections: system_architecture, "
            "technology_stack (frontend/backend/testing), code_organization, design_patterns, "
            "api_standards, and security_standards. Used for planning technical implementation."
        ),
        data_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Architecture document title"},
                "content": {"type": "object", "description": "Nested structure with sections: system_architecture, technology_stack, code_organization, design_patterns, api_standards, security_standards"},
                "contextSources": {"type": "array", "description": "References to other documents"},
            },
        },
        available_actions=["create", "read", "update", "delete", "list"],
        usage_guidelines="Use technical architectures for system design documentation. Update specific sections of the content when refining architecture decisions. Read to understand existing technical decisions before making changes.",
        example_prompts=["Create a technical architecture for the new microservice", "What technical architectures exist?", "Update the technology stack section", "Read the API standards from our architecture doc"],
        tools=[
            ToolDefinition(tool_id="technical_architectures.create", app_id="technical_architectures", action=ToolAction.CREATE, name="Create Technical Architecture", description="Creates a new technical architecture document", parameters={"type": "object", "properties": {"title": {"type": "string", "description": "Architecture title"}, "content": {"type": "object", "description": "Initial content sections"}}, "required": ["title"]}, handler=handlers["create"]),
            ToolDefinition(tool_id="technical_architectures.read", app_id="technical_architectures", action=ToolAction.READ, name="Read Technical Architecture", description="Reads a technical architecture document by ID", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}}, "required": ["id"]}, handler=handlers["read"]),
            ToolDefinition(tool_id="technical_architectures.update", app_id="technical_architectures", action=ToolAction.UPDATE, name="Update Technical Architecture", description="Updates a technical architecture's title or content sections", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}, "title": {"type": "string"}, "content": {"type": "object"}}, "required": ["id"]}, handler=handlers["update"]),
            ToolDefinition(tool_id="technical_architectures.delete", app_id="technical_architectures", action=ToolAction.DELETE, name="Delete Technical Architecture", description="Deletes a technical architecture document", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}}, "required": ["id"]}, handler=handlers["delete"]),
            ToolDefinition(tool_id="technical_architectures.list", app_id="technical_architectures", action=ToolAction.LIST, name="List Technical Architectures", description="Lists all technical architectures in the workspace", parameters={"type": "object", "properties": {}}, handler=handlers["list"]),
        ],
    )
    registry.register_app(app_def)
