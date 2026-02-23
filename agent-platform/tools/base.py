"""Core abstractions for the tool system."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable


class ToolAction(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LIST = "list"


@dataclass
class ToolDefinition:
    tool_id: str              # e.g. "pyramids.create"
    app_id: str               # e.g. "pyramids"
    action: ToolAction
    name: str                 # Human-readable, e.g. "Create Pyramid"
    description: str          # For LLM tool description
    parameters: dict          # JSON Schema for input parameters
    handler: Callable         # fn(db, workspace_id, user_id, params) -> dict


@dataclass
class AppDefinition:
    app_id: str                    # e.g. "pyramids"
    name: str                      # e.g. "Pyramids"
    firestore_collection: str      # e.g. "pyramids" (actual Firestore collection name)
    description: str               # What this app does (for agent onboarding)
    data_schema: dict              # JSON Schema of the Firestore document
    available_actions: list[str]   # e.g. ["create", "read", "update", "delete", "list"]
    usage_guidelines: str          # When and how to use this app
    example_prompts: list[str]     # Example user requests that map to this app
    tools: list[ToolDefinition] = field(default_factory=list)
