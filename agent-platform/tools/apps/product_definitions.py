"""Product Definitions app tool registration."""

from tools.base import AppDefinition, ToolDefinition, ToolAction
from tools.handlers import make_crud_handlers


def register_product_definitions(registry):
    handlers = make_crud_handlers(
        collection_name="productDefinitions",
        app_id="product_definitions",
        create_defaults={"data": {}, "linkedPyramidId": None, "contextSources": []},
        updatable_fields={"title", "data", "linkedPyramidId", "contextSources"},
    )

    app_def = AppDefinition(
        app_id="product_definitions",
        name="Product Definitions",
        firestore_collection="productDefinitions",
        description=(
            "Product Definitions is a structured product planning tool. "
            "Each definition contains a tree of nodes that describe product aspects: "
            "features, requirements, user stories, market analysis, etc. "
            "Nodes are organized hierarchically in the 'data' field as Record<nodeId, Node>. "
            "Can be linked to a pyramid for context tracing."
        ),
        data_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Product definition title"},
                "data": {"type": "object", "description": "Record<nodeId, ProductDefinitionNode>. Each node: {id, label, description, children[], parentId}"},
                "linkedPyramidId": {"type": "string", "description": "Optional linked pyramid ID for context"},
                "contextSources": {"type": "array", "description": "References to other documents: [{type, id, title}]"},
            },
        },
        available_actions=["create", "read", "update", "delete", "list"],
        usage_guidelines=(
            "Use product definitions when users want to define product features, "
            "requirements, or structure. Update the 'data' field to add/modify nodes. "
            "Link to pyramids when the product definition derives from brainstorming."
        ),
        example_prompts=[
            "Create a product definition for the authentication module",
            "List all product definitions",
            "Update the features section of my product definition",
            "Link this product definition to my brainstorming pyramid",
        ],
        tools=[
            ToolDefinition(tool_id="product_definitions.create", app_id="product_definitions", action=ToolAction.CREATE, name="Create Product Definition", description="Creates a new product definition document", parameters={"type": "object", "properties": {"title": {"type": "string", "description": "Product definition title"}, "linkedPyramidId": {"type": "string", "description": "Optional pyramid ID to link"}}, "required": ["title"]}, handler=handlers["create"]),
            ToolDefinition(tool_id="product_definitions.read", app_id="product_definitions", action=ToolAction.READ, name="Read Product Definition", description="Reads a product definition by ID with full node tree", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}}, "required": ["id"]}, handler=handlers["read"]),
            ToolDefinition(tool_id="product_definitions.update", app_id="product_definitions", action=ToolAction.UPDATE, name="Update Product Definition", description="Updates a product definition's title, data nodes, or linked pyramid", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}, "title": {"type": "string"}, "data": {"type": "object"}, "linkedPyramidId": {"type": "string"}}, "required": ["id"]}, handler=handlers["update"]),
            ToolDefinition(tool_id="product_definitions.delete", app_id="product_definitions", action=ToolAction.DELETE, name="Delete Product Definition", description="Deletes a product definition by ID", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Document ID"}}, "required": ["id"]}, handler=handlers["delete"]),
            ToolDefinition(tool_id="product_definitions.list", app_id="product_definitions", action=ToolAction.LIST, name="List Product Definitions", description="Lists all product definitions in the workspace", parameters={"type": "object", "properties": {}}, handler=handlers["list"]),
        ],
    )
    registry.register_app(app_def)
