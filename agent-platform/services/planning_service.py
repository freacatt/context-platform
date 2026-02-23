"""Chain-of-thought planning — structured multi-step reasoning for complex tasks."""

import json
from datetime import datetime, timezone
from uuid import uuid4

from ai.models import get_chat_model
from core.config import settings
from services.chat_service import ChatService
from services.permission_service import can_execute, get_agent_tools, get_agent_app_definitions
from services.execution_service import ExecutionService
from services import session_service
from tools.registry import get_tool_registry


PLANNING_KEYWORDS = [
    "plan", "steps", "strategy", "how to", "break down",
    "multi-step", "workflow", "process", "sequence",
]

COMPLEXITY_INDICATORS = [
    " and ", " then ", " after ", " before ", " finally ",
    "multiple", "several", "each", "all of",
]


class PlanningService:
    """Generates and executes structured multi-step plans."""

    def __init__(self, db, agent_data: dict, session_data: dict):
        self.db = db
        self.agent_data = agent_data
        self.session_data = session_data
        self.workspace_id = session_data["workspaceId"]
        self.user_id = session_data["userId"]

    @staticmethod
    def should_use_planning(agent_data: dict, message: str) -> bool:
        """Heuristic: should this message trigger planning mode?"""
        msg_lower = message.lower()

        # Explicit planning request
        if any(kw in msg_lower for kw in PLANNING_KEYWORDS):
            return True

        # Complex task indicators (at least 2)
        complexity_count = sum(1 for ind in COMPLEXITY_INDICATORS if ind in msg_lower)
        if complexity_count >= 2:
            return True

        return False

    def generate_plan(self, message: str, context: str | None = None) -> dict:
        """Ask LLM to generate a structured plan as JSON."""
        tool_defs = get_agent_tools(self.agent_data)
        app_defs = get_agent_app_definitions(self.agent_data)

        tool_descriptions = []
        for td in tool_defs:
            tool_descriptions.append(f"- {td.tool_id}: {td.description}")
        tools_text = "\n".join(tool_descriptions) if tool_descriptions else "No tools available."

        system_prompt = (
            "You are a planning assistant. Given a user request, generate a structured plan.\n"
            "Return ONLY valid JSON with this structure:\n"
            "{\n"
            '  "goal": "brief description of the overall goal",\n'
            '  "steps": [\n'
            '    {"id": "step-1", "description": "what to do", "tool_id": "app.action or null", "args": {}}\n'
            "  ]\n"
            "}\n\n"
            "Available tools:\n" + tools_text
        )

        if context:
            system_prompt += f"\n\nAdditional context:\n{context}"

        config = ChatService._build_model_config(self.agent_data)
        llm = get_chat_model(config)

        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=message),
        ]

        response = llm.invoke(messages)
        content = response.content if isinstance(response.content, str) else str(response.content)

        # Parse JSON from response
        try:
            plan_data = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            import re
            match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
            if match:
                plan_data = json.loads(match.group(1))
            else:
                plan_data = {"goal": message, "steps": []}

        # Validate tool IDs in plan
        registry = get_tool_registry()
        for step in plan_data.get("steps", []):
            tool_id = step.get("tool_id")
            if tool_id and registry.get_tool(tool_id) is None:
                step["tool_id"] = None
                step["description"] += " (tool not found, will handle manually)"

        # Build plan object
        now = datetime.now(timezone.utc).isoformat()
        plan = {
            "goal": plan_data.get("goal", message),
            "status": "awaiting_approval",
            "steps": [
                {
                    "id": step.get("id", f"step-{i+1}"),
                    "description": step.get("description", ""),
                    "tool_id": step.get("tool_id"),
                    "args": step.get("args", {}),
                    "status": "pending",
                    "result": None,
                }
                for i, step in enumerate(plan_data.get("steps", []))
            ],
            "created_at": now,
            "updated_at": now,
        }

        return plan

    def store_plan(self, plan: dict) -> dict:
        """Store plan in session metadata."""
        ref = self.db.collection("sessions").document(self.session_data["id"])
        doc = ref.get()
        data = doc.to_dict()
        metadata = data.get("metadata", {})
        metadata["plan"] = plan
        ref.update({
            "metadata": metadata,
            "updatedAt": datetime.now(timezone.utc),
        })
        return plan

    def get_plan(self) -> dict | None:
        """Get plan from session metadata."""
        data = session_service.get_session(self.db, self.session_data["id"])
        return data.get("metadata", {}).get("plan")

    def approve_plan(self) -> dict:
        """Mark plan as executing."""
        plan = self.get_plan()
        if not plan:
            raise ValueError("No plan found in session")
        if plan["status"] != "awaiting_approval":
            raise ValueError(f"Plan is not awaiting approval (status: {plan['status']})")
        plan["status"] = "executing"
        plan["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.store_plan(plan)
        return plan

    def execute_plan(self) -> dict:
        """Execute all pending steps in the plan."""
        plan = self.get_plan()
        if not plan:
            raise ValueError("No plan found in session")
        if plan["status"] != "executing":
            raise ValueError(f"Plan is not in executing state (status: {plan['status']})")

        results = []
        all_success = True

        for step in plan["steps"]:
            if step["status"] != "pending":
                continue

            step_result = self.execute_step(step)
            results.append(step_result)

            if not step_result.get("success", False):
                all_success = False
                plan["status"] = "failed"
                plan["updated_at"] = datetime.now(timezone.utc).isoformat()
                self.store_plan(plan)
                break

        if all_success:
            plan["status"] = "completed"
            plan["updated_at"] = datetime.now(timezone.utc).isoformat()
            self.store_plan(plan)

        return {
            "plan_status": plan["status"],
            "step_results": results,
        }

    def execute_step(self, step: dict) -> dict:
        """Execute a single plan step."""
        step["status"] = "in_progress"
        self.store_plan(self.get_plan())

        tool_id = step.get("tool_id")
        args = step.get("args", {})

        if not tool_id:
            # No tool — mark as completed (manual/informational step)
            step["status"] = "completed"
            step["result"] = {"success": True, "message": "Informational step completed"}
            self._update_step(step)
            return step["result"]

        # Permission check
        if not can_execute(self.agent_data, tool_id):
            step["status"] = "failed"
            step["result"] = {"success": False, "error": f"Permission denied for tool '{tool_id}'"}
            self._update_step(step)
            return step["result"]

        # Execute tool
        registry = get_tool_registry()
        tool_def = registry.get_tool(tool_id)
        if tool_def is None:
            step["status"] = "failed"
            step["result"] = {"success": False, "error": f"Tool '{tool_id}' not found"}
            self._update_step(step)
            return step["result"]

        try:
            result = tool_def.handler(self.db, self.workspace_id, self.user_id, args)
            step["status"] = "completed"
            step["result"] = result
        except Exception as e:
            step["status"] = "failed"
            step["result"] = {"success": False, "error": str(e)}

        self._update_step(step)

        # Store in session messages
        session_service.add_message(
            self.db, self.session_data["id"],
            role="tool_call",
            content=json.dumps({"tool_id": tool_id, "args": args, "call_id": step["id"]}),
            metadata={"tool_id": tool_id, "plan_step": step["id"]},
        )
        session_service.add_message(
            self.db, self.session_data["id"],
            role="tool_result",
            content=json.dumps(step["result"]),
            metadata={"tool_id": tool_id, "call_id": step["id"], "plan_step": step["id"]},
        )

        return step["result"]

    def skip_step(self, step_id: str) -> dict:
        """Skip a pending step."""
        plan = self.get_plan()
        if not plan:
            raise ValueError("No plan found in session")
        for step in plan["steps"]:
            if step["id"] == step_id:
                if step["status"] != "pending":
                    raise ValueError(f"Step '{step_id}' is not pending (status: {step['status']})")
                step["status"] = "skipped"
                step["result"] = {"success": True, "message": "Step skipped by user"}
                plan["updated_at"] = datetime.now(timezone.utc).isoformat()
                self.store_plan(plan)
                return step
        raise ValueError(f"Step '{step_id}' not found in plan")

    def _update_step(self, step: dict):
        """Update a step in the stored plan."""
        plan = self.get_plan()
        if not plan:
            return
        for i, s in enumerate(plan["steps"]):
            if s["id"] == step["id"]:
                plan["steps"][i] = step
                break
        plan["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.store_plan(plan)
