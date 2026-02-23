"""Technical Tasks app tool registration."""

from tools.base import AppDefinition, ToolDefinition, ToolAction
from tools.handlers import make_crud_handlers


def register_technical_tasks(registry):
    handlers = make_crud_handlers(
        collection_name="technicalTasks",
        app_id="technical_tasks",
        create_defaults={"description": "", "status": "todo", "priority": "medium", "assignee": None, "contextSources": []},
        updatable_fields={"title", "description", "status", "priority", "assignee", "contextSources"},
    )

    app_def = AppDefinition(
        app_id="technical_tasks",
        name="Technical Tasks",
        firestore_collection="technicalTasks",
        description=(
            "Technical Tasks is a kanban-style task management tool. "
            "Tasks have a title, description, status (todo/in_progress/done), "
            "priority (low/medium/high), and optional assignee. "
            "Used for tracking implementation work and technical deliverables."
        ),
        data_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Task title"},
                "description": {"type": "string", "description": "Task description"},
                "status": {"type": "string", "enum": ["todo", "in_progress", "done"], "description": "Task status"},
                "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Task priority"},
                "assignee": {"type": "string", "description": "Assigned person"},
                "contextSources": {"type": "array", "description": "References to related documents"},
            },
        },
        available_actions=["create", "read", "update", "delete", "list"],
        usage_guidelines="Use technical tasks for tracking work items. Create tasks when users identify work to be done. Update status as work progresses. List tasks to see current workload and progress.",
        example_prompts=["Create a task to implement user authentication", "List all tasks in progress", "Mark the login task as done", "What are the high priority tasks?"],
        tools=[
            ToolDefinition(tool_id="technical_tasks.create", app_id="technical_tasks", action=ToolAction.CREATE, name="Create Technical Task", description="Creates a new technical task", parameters={"type": "object", "properties": {"title": {"type": "string", "description": "Task title"}, "description": {"type": "string", "description": "Task details"}, "status": {"type": "string"}, "priority": {"type": "string"}}, "required": ["title"]}, handler=handlers["create"]),
            ToolDefinition(tool_id="technical_tasks.read", app_id="technical_tasks", action=ToolAction.READ, name="Read Technical Task", description="Reads a technical task by ID", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Task ID"}}, "required": ["id"]}, handler=handlers["read"]),
            ToolDefinition(tool_id="technical_tasks.update", app_id="technical_tasks", action=ToolAction.UPDATE, name="Update Technical Task", description="Updates a task's title, description, status, or priority", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Task ID"}, "title": {"type": "string"}, "description": {"type": "string"}, "status": {"type": "string"}, "priority": {"type": "string"}}, "required": ["id"]}, handler=handlers["update"]),
            ToolDefinition(tool_id="technical_tasks.delete", app_id="technical_tasks", action=ToolAction.DELETE, name="Delete Technical Task", description="Deletes a technical task", parameters={"type": "object", "properties": {"id": {"type": "string", "description": "Task ID"}}, "required": ["id"]}, handler=handlers["delete"]),
            ToolDefinition(tool_id="technical_tasks.list", app_id="technical_tasks", action=ToolAction.LIST, name="List Technical Tasks", description="Lists all technical tasks in the workspace", parameters={"type": "object", "properties": {}}, handler=handlers["list"]),
        ],
    )
    registry.register_app(app_def)
