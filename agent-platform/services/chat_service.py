from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from ai.models import AgentModelConfig, ModelSelectionMode, Provider, get_chat_model
from core.config import settings


class ChatService:
    """Stateless chat service — receives agent config + messages, calls LLM, returns text."""

    def chat(
        self,
        agent_data: dict,
        message: str,
        history: list[dict] | None = None,
        context: str | None = None,
    ) -> tuple[str, str]:
        """Call LLM using agent configuration.

        Returns (response_text, model_used).
        """
        config = self._build_model_config(agent_data)
        llm = get_chat_model(config)
        messages = self._build_messages(agent_data, message, history, context)
        response = llm.invoke(messages)
        model_used = config.model or settings.llm_model
        content = response.content if isinstance(response.content, str) else str(response.content)
        return content, model_used

    @staticmethod
    def _build_model_config(agent_data: dict) -> AgentModelConfig:
        mode_str = agent_data.get("modelMode", "auto")
        mode = ModelSelectionMode.MANUAL if mode_str == "manual" else ModelSelectionMode.AUTO
        provider = None
        if agent_data.get("modelProvider"):
            provider = Provider(agent_data["modelProvider"])
        return AgentModelConfig(
            mode=mode,
            provider=provider,
            model=agent_data.get("modelName"),
        )

    @staticmethod
    def _build_messages(
        agent_data: dict,
        message: str,
        history: list[dict] | None = None,
        context: str | None = None,
    ) -> list:
        messages: list = []

        # System prompt from agent context
        system_parts: list[str] = []
        agent_context = agent_data.get("context", "")
        if agent_context:
            system_parts.append(agent_context)
        if context:
            system_parts.append(f"Additional context:\n{context}")
        if system_parts:
            messages.append(SystemMessage(content="\n\n".join(system_parts)))

        # Conversation history
        for entry in history or []:
            role = entry.get("role", "user")
            content = entry.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

        # Current user message
        messages.append(HumanMessage(content=message))
        return messages
