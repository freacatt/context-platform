"""Agent execution loop — LLM call with tool binding and execution."""

import json
from uuid import uuid4

from langchain_core.messages import (
    AIMessage, HumanMessage, SystemMessage, ToolMessage,
)
from langchain_core.tools import StructuredTool
from pydantic import create_model

from ai.models import get_chat_model
from core.config import settings
from services.chat_service import ChatService
from services.permission_service import can_execute, get_agent_app_definitions, get_agent_tools
from services import session_service
from tools.base import ToolDefinition
from tools.registry import get_tool_registry


class ExecutionService:
    """Handles the agent execution loop: LLM call -> tool calls -> result -> repeat."""

    MAX_TOOL_ITERATIONS = 10

    def __init__(self, db, agent_data: dict, session_data: dict):
        self.db = db
        self.agent_data = agent_data
        self.session_data = session_data
        self.workspace_id = session_data["workspaceId"]
        self.user_id = session_data["userId"]

    def execute(self, user_message: str, context: str | None = None) -> dict:
        """Run the full execution loop.

        Returns dict with: response, model, tool_calls, messages_added
        """
        # 1. Get agent's allowed tools
        tool_defs = get_agent_tools(self.agent_data)
        langchain_tools = self._build_langchain_tools(tool_defs)

        # 2. Build system prompt with app context
        app_defs = get_agent_app_definitions(self.agent_data)
        system_prompt = self._build_system_prompt(app_defs, context)

        # 3. Build messages from session history
        messages = self._build_messages(system_prompt)

        # 4. Build LLM with tools bound
        config = ChatService._build_model_config(self.agent_data)
        llm = get_chat_model(config)
        if langchain_tools:
            llm_with_tools = llm.bind_tools(langchain_tools)
        else:
            llm_with_tools = llm

        model_used = config.model or settings.llm_model

        # 5. Execution loop
        all_tool_calls = []
        messages_added = []
        iteration = 0

        while iteration < self.MAX_TOOL_ITERATIONS:
            iteration += 1
            response = llm_with_tools.invoke(messages)

            # Check if LLM wants to call tools
            if hasattr(response, "tool_calls") and response.tool_calls:
                # Add AI message with tool calls to the conversation
                messages.append(response)

                for tool_call in response.tool_calls:
                    tool_id = tool_call["name"]
                    tool_args = tool_call["args"]
                    call_id = tool_call.get("id", str(uuid4()))

                    # Permission check
                    if not can_execute(self.agent_data, tool_id):
                        tool_result = {
                            "success": False,
                            "error": f"Permission denied for tool '{tool_id}'",
                        }
                    else:
                        tool_def = get_tool_registry().get_tool(tool_id)
                        if tool_def is None:
                            tool_result = {
                                "success": False,
                                "error": f"Tool '{tool_id}' not found",
                            }
                        else:
                            try:
                                tool_result = tool_def.handler(
                                    self.db, self.workspace_id, self.user_id, tool_args,
                                )
                            except Exception as e:
                                tool_result = {"success": False, "error": str(e)}

                    # Store tool_call in session
                    tc_msg = session_service.add_message(
                        self.db, self.session_data["id"],
                        role="tool_call",
                        content=json.dumps({
                            "tool_id": tool_id,
                            "args": tool_args,
                            "call_id": call_id,
                        }),
                        metadata={"tool_id": tool_id},
                    )
                    messages_added.append(tc_msg)

                    # Store tool_result in session
                    tr_msg = session_service.add_message(
                        self.db, self.session_data["id"],
                        role="tool_result",
                        content=json.dumps(tool_result),
                        metadata={"tool_id": tool_id, "call_id": call_id},
                    )
                    messages_added.append(tr_msg)

                    all_tool_calls.append({
                        "tool_id": tool_id,
                        "args": tool_args,
                        "result": tool_result,
                    })

                    # Add tool result to messages for next LLM call
                    messages.append(ToolMessage(
                        content=json.dumps(tool_result),
                        tool_call_id=call_id,
                    ))
            else:
                # LLM returned text response — done
                content = (
                    response.content
                    if isinstance(response.content, str)
                    else str(response.content)
                )
                return {
                    "response": content,
                    "model": model_used,
                    "tool_calls": all_tool_calls,
                    "messages_added": messages_added,
                }

        # Safety: exceeded max iterations
        return {
            "response": "I've reached the maximum number of tool calls for this turn.",
            "model": model_used,
            "tool_calls": all_tool_calls,
            "messages_added": messages_added,
        }

    def _build_langchain_tools(self, tool_defs: list[ToolDefinition]) -> list[StructuredTool]:
        """Convert ToolDefinitions to LangChain StructuredTool objects."""
        tools = []
        for td in tool_defs:
            args_model = _build_args_model(td)
            # Capture variables in closure
            handler = _make_tool_handler(td.handler, self.db, self.workspace_id, self.user_id)
            tool = StructuredTool(
                name=td.tool_id,
                description=td.description,
                func=handler,
                args_schema=args_model,
            )
            tools.append(tool)
        return tools

    def _build_system_prompt(self, app_defs: list, context: str | None) -> str:
        """Build system prompt including agent context and app definitions."""
        parts = []

        agent_context = self.agent_data.get("context", "")
        if agent_context:
            parts.append(agent_context)

        if app_defs:
            app_parts = ["## Available Apps and Tools\n"]
            for app_def in app_defs:
                app_parts.append(f"### {app_def.name}")
                app_parts.append(app_def.description)
                app_parts.append(f"Available actions: {', '.join(app_def.available_actions)}")
                app_parts.append(f"Guidelines: {app_def.usage_guidelines}")
                app_parts.append("")
            parts.append("\n".join(app_parts))

        if context:
            parts.append(f"Additional context:\n{context}")

        return "\n\n".join(parts)

    def _build_messages(self, system_prompt: str) -> list:
        """Build LangChain messages from system prompt + session history."""
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))

        for msg in self.session_data.get("messages", []):
            role = msg.get("role")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
            elif role == "tool_call":
                try:
                    tc_data = json.loads(content)
                    messages.append(AIMessage(
                        content="",
                        tool_calls=[{
                            "name": tc_data["tool_id"],
                            "args": tc_data["args"],
                            "id": tc_data.get("call_id", ""),
                        }],
                    ))
                except (json.JSONDecodeError, KeyError):
                    pass
            elif role == "tool_result":
                call_id = msg.get("metadata", {}).get("call_id", "")
                messages.append(ToolMessage(
                    content=content,
                    tool_call_id=call_id,
                ))
        return messages


def _make_tool_handler(handler, db, workspace_id, user_id):
    """Create a closure that wraps a tool handler with db/workspace/user context."""
    def wrapped(**kwargs):
        return handler(db, workspace_id, user_id, kwargs)
    return wrapped


def _build_args_model(td: ToolDefinition):
    """Build a Pydantic model from a ToolDefinition's JSON Schema parameters."""
    fields = {}
    props = td.parameters.get("properties", {})
    required = set(td.parameters.get("required", []))

    type_map = {
        "string": str,
        "integer": int,
        "number": float,
        "boolean": bool,
        "object": dict,
        "array": list,
    }

    for name, schema in props.items():
        py_type = type_map.get(schema.get("type", "string"), str)
        if name in required:
            fields[name] = (py_type, ...)
        else:
            fields[name] = (py_type | None, None)

    # Create a unique model name to avoid conflicts
    model_name = td.tool_id.replace(".", "_") + "_Args"
    return create_model(model_name, **fields)
