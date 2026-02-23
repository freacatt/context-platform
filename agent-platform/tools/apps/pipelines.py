"""Pipelines app tool registration."""

from tools.base import AppDefinition, ToolDefinition, ToolAction
from tools.handlers import make_crud_handlers


def register_pipelines(registry):
    handlers = make_crud_handlers(
        collection_name="pipelines",
        app_id="pipelines",
        create_defaults={"stages": [], "status": "draft", "contextSources": []},
        updatable_fields={"title", "stages", "status", "contextSources"},
    )

    app_def = AppDefinition(
        app_id="pipelines",
        name="Pipelines",
        firestore_collection="pipelines",
        description=(
            "Pipelines defines sequential workflows and processes. "
            "Each pipeline has ordered stages that represent steps in a process. "
            "Used for CI/CD pipelines, deployment flows, data processing pipelines, "
            "or any multi-step workflow definition."
        ),
        data_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Pipeline title"},
                "stages": {"type": "array", "description": "Ordered list of stages: [{name, description, config}]"},
                "status": {"type": "string", "enum": ["draft", "active", "archived"], "description": "Pipeline status"},
                "contextSources": {"type": "array", "description": "References to related documents"},
            },
        },
        available_actions=["create", "read", "update", "delete", "list"],
        usage_guidelines="Use pipelines to define sequential workflows. Add stages for each step in the process. Update stage configurations as requirements change.",
        example_prompts=["Create a deployment pipeline", "Add a testing stage to the pipeline", "List all pipelines", "Update the build stage configuration"],
        tools=[
            ToolDefinition(tool_id="pipelines.create", app_id="pipelines", action=ToolAction.CREATE, name="Create Pipeline", description="Creates a new pipeline", parameters={"type": "object", "properties": {"title": {"type": "string", "description": "Pipeline title"}, "stages": {"type": "array", "description": "Initial stages"}}, "required": ["title"]}, handler=handlers["create"]),
            ToolDefinition(tool_id="pipelines.read", app_id="pipelines", action=ToolAction.READ, name="Read Pipeline", description="Reads a pipeline by ID", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Pipeline ID"}}, "required": ["id"]}, handler=handlers["read"]),
            ToolDefinition(tool_id="pipelines.update", app_id="pipelines", action=ToolAction.UPDATE, name="Update Pipeline", description="Updates a pipeline's title, stages, or status", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Pipeline ID"}, "title": {"type": "string"}, "stages": {"type": "array"}, "status": {"type": "string"}}, "required": ["id"]}, handler=handlers["update"]),
            ToolDefinition(tool_id="pipelines.delete", app_id="pipelines", action=ToolAction.DELETE, name="Delete Pipeline", description="Deletes a pipeline", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Pipeline ID"}}, "required": ["id"]}, handler=handlers["delete"]),
            ToolDefinition(tool_id="pipelines.list", app_id="pipelines", action=ToolAction.LIST, name="List Pipelines", description="Lists all pipelines in the workspace", parameters={"type": "object", "properties": {}}, handler=handlers["list"]),
        ],
    )
    registry.register_app(app_def)
