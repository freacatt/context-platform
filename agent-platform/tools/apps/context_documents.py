"""Context Documents app tool registration."""

from tools.base import AppDefinition, ToolDefinition, ToolAction
from tools.handlers import make_crud_handlers


def register_context_documents(registry):
    handlers = make_crud_handlers(
        collection_name="contextDocuments",
        app_id="context_documents",
        create_defaults={"content": ""},
        updatable_fields={"title", "content"},
    )

    app_def = AppDefinition(
        app_id="context_documents",
        name="Context Documents",
        firestore_collection="contextDocuments",
        description=(
            "Context Documents is a knowledge base for storing free-form text documents. "
            "Each document has a title and content (plain text or markdown). "
            "Used as background context for other apps and AI interactions. "
            "These documents feed into the global context system."
        ),
        data_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Document title"},
                "content": {"type": "string", "description": "Document content (text or markdown)"},
            },
        },
        available_actions=["create", "read", "update", "delete", "list"],
        usage_guidelines="Use context documents to store background information, requirements, meeting notes, or any reference material. These documents can be linked as context sources in other apps.",
        example_prompts=["Create a context document with the project requirements", "List all context documents", "Update the meeting notes document", "Read the requirements document"],
        tools=[
            ToolDefinition(tool_id="context_documents.create", app_id="context_documents", action=ToolAction.CREATE, name="Create Context Document", description="Creates a new context document", parameters={"type": "object", "properties": {"title": {"type": "string", "description": "Document title"}, "content": {"type": "string", "description": "Document content"}}, "required": ["title"]}, handler=handlers["create"]),
            ToolDefinition(tool_id="context_documents.read", app_id="context_documents", action=ToolAction.READ, name="Read Context Document", description="Reads a context document by ID", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}}, "required": ["id"]}, handler=handlers["read"]),
            ToolDefinition(tool_id="context_documents.update", app_id="context_documents", action=ToolAction.UPDATE, name="Update Context Document", description="Updates a context document's title or content", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}, "title": {"type": "string"}, "content": {"type": "string"}}, "required": ["id"]}, handler=handlers["update"]),
            ToolDefinition(tool_id="context_documents.delete", app_id="context_documents", action=ToolAction.DELETE, name="Delete Context Document", description="Deletes a context document", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}}, "required": ["id"]}, handler=handlers["delete"]),
            ToolDefinition(tool_id="context_documents.list", app_id="context_documents", action=ToolAction.LIST, name="List Context Documents", description="Lists all context documents in the workspace", parameters={"type": "object", "properties": {}}, handler=handlers["list"]),
        ],
    )
    registry.register_app(app_def)
