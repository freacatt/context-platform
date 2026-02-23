"""Orchestration — agent-to-agent delegation via sub-sessions."""

import json
from datetime import datetime, timezone

from services import agents as agent_service
from services import session_service
from services.execution_service import ExecutionService
from services.permission_service import get_agent_tools


MAX_DELEGATION_DEPTH = 3


class OrchestrationService:
    """Handles agent discovery and task delegation."""

    def __init__(self, db, workspace_id: str, user_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.user_id = user_id

    def find_agents_for_task(
        self,
        required_app_ids: list[str] | None = None,
        required_permissions: list[str] | None = None,
    ) -> list[dict]:
        """Find specialist agents that can handle a task based on app access.

        Excludes orchestrator/GM agents from results.
        """
        all_agents = agent_service.list_agents(self.db, self.workspace_id)
        candidates = []

        for agent in all_agents:
            # Skip orchestrators and GM agents
            if agent.get("isOrchestrator") or agent.get("type") == "gm":
                continue

            # Skip agents with no app access
            app_access = agent.get("appAccess", [])
            if not app_access:
                continue

            # Check if agent has access to required apps/permissions
            if required_app_ids:
                agent_app_ids = {a.get("appId") for a in app_access}
                if not set(required_app_ids).issubset(agent_app_ids):
                    continue

            if required_permissions and required_app_ids:
                # Check that each required app has the required permissions
                has_all = True
                for app_id in required_app_ids:
                    agent_perms = set()
                    for a in app_access:
                        if a.get("appId") == app_id:
                            agent_perms = set(a.get("permissions", []))
                            break
                    if not set(required_permissions).issubset(agent_perms):
                        has_all = False
                        break
                if not has_all:
                    continue

            candidates.append(agent)

        return candidates

    def delegate(
        self,
        parent_session_id: str,
        target_agent: dict,
        task: str,
        context: str | None = None,
        depth: int = 0,
    ) -> dict:
        """Delegate a task to a target agent via a sub-session.

        Creates a sub-session, executes the task, stores delegation trace
        in parent session, and completes the sub-session.

        Returns dict with: agent_id, agent_name, session_id, response, tool_calls
        """
        if depth >= MAX_DELEGATION_DEPTH:
            return {
                "success": False,
                "error": "Maximum delegation depth reached",
                "agent_id": target_agent["id"],
                "agent_name": target_agent.get("name", ""),
            }

        # Create sub-session
        sub_session = session_service.create_session(
            self.db,
            workspace_id=self.workspace_id,
            agent_id=target_agent["id"],
            user_id=self.user_id,
            parent_session_id=parent_session_id,
        )

        # Add the delegated task as a user message
        session_service.add_message(self.db, sub_session["id"], "user", task)
        # Reload to get updated messages
        sub_session = session_service.get_session(self.db, sub_session["id"])

        # Execute using the target agent
        agent_tools = get_agent_tools(target_agent)

        if agent_tools:
            execution = ExecutionService(self.db, target_agent, sub_session)
            result = execution.execute(task, context=context)
            response_text = result["response"]
            tool_calls = result.get("tool_calls", [])
        else:
            # Simple chat agent with no tools
            from services.chat_service import ChatService
            chat_service = ChatService()
            response_text, _ = chat_service.chat(
                agent_data=target_agent,
                message=task,
                context=context,
            )
            tool_calls = []

        # Store assistant response in sub-session
        session_service.add_message(
            self.db, sub_session["id"], "assistant", response_text,
        )

        # Complete the sub-session
        session_service.update_session_status(self.db, sub_session["id"], "completed")

        # Store delegation trace in parent session
        delegation_trace = {
            "agent_id": target_agent["id"],
            "agent_name": target_agent.get("name", ""),
            "sub_session_id": sub_session["id"],
            "task": task,
            "response_preview": response_text[:200] if response_text else "",
            "tool_call_count": len(tool_calls),
        }
        session_service.add_message(
            self.db, parent_session_id,
            role="tool_result",
            content=json.dumps({
                "success": True,
                "delegation": delegation_trace,
                "response": response_text,
            }),
            metadata={"type": "delegation", "agent_id": target_agent["id"]},
        )

        return {
            "success": True,
            "agent_id": target_agent["id"],
            "agent_name": target_agent.get("name", ""),
            "session_id": sub_session["id"],
            "response": response_text,
            "tool_calls": tool_calls,
        }


def build_delegate_tool_handler(db, workspace_id: str, user_id: str, parent_session_id: str):
    """Build a __delegate__ tool handler for an orchestrator agent.

    Returns a handler function compatible with tool execution.
    """
    orch = OrchestrationService(db, workspace_id, user_id)

    def handler(db, workspace_id, user_id, params):
        task = params.get("task", "")
        target_agent_id = params.get("agent_id")
        app_ids = params.get("app_ids", [])
        context = params.get("context")

        if target_agent_id:
            # Direct delegation to a specific agent
            try:
                target_agent = agent_service.get_agent(db, target_agent_id)
            except Exception:
                return {"success": False, "error": f"Agent '{target_agent_id}' not found"}
        elif app_ids:
            # Find best agent for the task
            candidates = orch.find_agents_for_task(required_app_ids=app_ids)
            if not candidates:
                return {
                    "success": False,
                    "error": f"No agents found with access to apps: {', '.join(app_ids)}",
                }
            target_agent = candidates[0]  # Pick first match
        else:
            return {"success": False, "error": "Must provide either agent_id or app_ids"}

        result = orch.delegate(
            parent_session_id=parent_session_id,
            target_agent=target_agent,
            task=task,
            context=context,
        )
        return result

    return handler
