"""Pyramids app tool registration."""

from tools.base import AppDefinition, ToolDefinition, ToolAction
from tools.handlers import make_crud_handlers


def register_pyramids(registry):
    handlers = make_crud_handlers(
        collection_name="pyramids",
        app_id="pyramids",
        create_defaults={
            "context": None,
            "blocks": {},
            "connections": [],
            "contextSources": [],
            "status": "active",
        },
        updatable_fields={"title", "context", "blocks", "connections", "contextSources", "status"},
    )

    app_def = AppDefinition(
        app_id="pyramids",
        name="Pyramids",
        firestore_collection="pyramids",
        description=(
            "Pyramids is a visual brainstorming and problem-solving tool. "
            "A pyramid has a root question at the top. Users explore answers, "
            "which generate follow-up questions, forming a tree structure. "
            "Each block is either a question or an answer. Blocks are connected "
            "via the connections array. Context sources can be linked from other apps."
        ),
        data_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Pyramid title"},
                "context": {"type": "string", "description": "Overall context or problem statement"},
                "blocks": {
                    "type": "object",
                    "description": "Record<blockId, Block>. Each Block: {id, type: 'question'|'answer', content, position: {x,y}, layer}",
                },
                "connections": {
                    "type": "array",
                    "description": "Array of {from, to} connecting parent blocks to child blocks",
                },
                "contextSources": {
                    "type": "array",
                    "description": "References to other app documents providing context: [{type, id, title}]",
                },
            },
        },
        available_actions=["create", "read", "update", "delete", "list"],
        usage_guidelines=(
            "Use pyramids when users want to brainstorm, explore problems, "
            "or build decision trees. Create new pyramids for new problems. "
            "Update blocks when refining questions or answers. "
            "Read pyramids to understand existing brainstorming context."
        ),
        example_prompts=[
            "Create a new pyramid to explore our authentication approach",
            "What pyramids do I have in this workspace?",
            "Update the root question of my pyramid",
            "Delete the old brainstorming pyramid",
        ],
        tools=[
            ToolDefinition(
                tool_id="pyramids.create", app_id="pyramids", action=ToolAction.CREATE,
                name="Create Pyramid",
                description="Creates a new pyramid for brainstorming and problem exploration",
                parameters={"type": "object", "properties": {"title": {"type": "string", "description": "Pyramid title"}, "context": {"type": "string", "description": "Problem context"}}, "required": ["title"]},
                handler=handlers["create"],
            ),
            ToolDefinition(
                tool_id="pyramids.read", app_id="pyramids", action=ToolAction.READ,
                name="Read Pyramid",
                description="Reads a pyramid by ID, returning its full structure including blocks and connections",
                parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Pyramid document ID"}}, "required": ["id"]},
                handler=handlers["read"],
            ),
            ToolDefinition(
                tool_id="pyramids.update", app_id="pyramids", action=ToolAction.UPDATE,
                name="Update Pyramid",
                description="Updates a pyramid's title, context, blocks, or connections",
                parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Pyramid document ID"}, "title": {"type": "string"}, "context": {"type": "string"}, "blocks": {"type": "object"}, "connections": {"type": "array"}}, "required": ["id"]},
                handler=handlers["update"],
            ),
            ToolDefinition(
                tool_id="pyramids.delete", app_id="pyramids", action=ToolAction.DELETE,
                name="Delete Pyramid",
                description="Deletes a pyramid by ID",
                parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Pyramid document ID"}}, "required": ["id"]},
                handler=handlers["delete"],
            ),
            ToolDefinition(
                tool_id="pyramids.list", app_id="pyramids", action=ToolAction.LIST,
                name="List Pyramids",
                description="Lists all pyramids in the workspace",
                parameters={"type": "object", "properties": {}},
                handler=handlers["list"],
            ),
        ],
    )
    registry.register_app(app_def)
