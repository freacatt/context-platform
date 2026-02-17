from dataclasses import dataclass
from enum import Enum
from typing import Literal

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from config import settings


class Provider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    GROK = "grok"
    DEEPSEEK = "deepseek"


class ModelSelectionMode(str, Enum):
    AUTO = "auto"
    MANUAL = "manual"


@dataclass
class ModelInfo:
    provider: Provider
    name: str
    label: str
    context_window: int | None = None
    supports_tools: bool = True


LLM_MODELS: dict[Provider, list[ModelInfo]] = {
    Provider.OPENAI: [
        ModelInfo(provider=Provider.OPENAI, name="gpt-4.1-mini", label="GPT-4.1 Mini", context_window=128000),
        ModelInfo(provider=Provider.OPENAI, name="gpt-4.1", label="GPT-4.1", context_window=128000),
        ModelInfo(provider=Provider.OPENAI, name="gpt-4o-mini", label="GPT-4o Mini", context_window=128000),
    ],
    Provider.ANTHROPIC: [
        ModelInfo(provider=Provider.ANTHROPIC, name="claude-3-5-sonnet-20241022", label="Claude 3.5 Sonnet", context_window=200000),
        ModelInfo(provider=Provider.ANTHROPIC, name="claude-3-5-haiku-20241022", label="Claude 3.5 Haiku", context_window=200000),
    ],
    Provider.GEMINI: [
        ModelInfo(provider=Provider.GEMINI, name="gemini-1.5-pro", label="Gemini 1.5 Pro", context_window=200000),
        ModelInfo(provider=Provider.GEMINI, name="gemini-1.5-flash", label="Gemini 1.5 Flash", context_window=200000),
    ],
    Provider.GROK: [
        ModelInfo(provider=Provider.GROK, name="grok-beta", label="Grok Beta"),
        ModelInfo(provider=Provider.GROK, name="grok-2-mini", label="Grok 2 Mini"),
    ],
    Provider.DEEPSEEK: [
        ModelInfo(provider=Provider.DEEPSEEK, name="deepseek-chat", label="DeepSeek Chat"),
        ModelInfo(provider=Provider.DEEPSEEK, name="deepseek-reasoner", label="DeepSeek Reasoner"),
    ],
}


EMBEDDING_MODELS: dict[Provider, list[str]] = {
    Provider.OPENAI: ["text-embedding-3-large", "text-embedding-3-small"],
    Provider.ANTHROPIC: ["text-embedding-3-large"],
    Provider.GEMINI: ["text-embedding-004"],
}


@dataclass
class AgentModelConfig:
    mode: ModelSelectionMode = ModelSelectionMode.AUTO
    provider: Provider | None = None
    model: str | None = None


def list_llm_models() -> list[ModelInfo]:
    items: list[ModelInfo] = []
    for values in LLM_MODELS.values():
        items.extend(values)
    return items


def get_default_llm_model(provider: Provider) -> ModelInfo:
    models = LLM_MODELS.get(provider)
    if not models:
        raise ValueError(f"No models registered for provider {provider}")
    if settings.llm_model:
        for m in models:
            if m.name == settings.llm_model:
                return m
    return models[0]


def create_chat_model(provider: Provider, model_name: str | None = None) -> BaseChatModel:
    if provider == Provider.OPENAI:
        from langchain_openai import ChatOpenAI

        if not settings.openai_api_key:
            raise RuntimeError("OPENAI API key is not configured")
        name = model_name or get_default_llm_model(provider).name
        return ChatOpenAI(
            model=name,
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
    if provider == Provider.ANTHROPIC:
        from langchain_anthropic import ChatAnthropic

        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC API key is not configured")
        name = model_name or get_default_llm_model(provider).name
        return ChatAnthropic(
            model=name,
            api_key=settings.anthropic_api_key,
        )
    if provider == Provider.GEMINI:
        from langchain_google_genai import ChatGoogleGenerativeAI

        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI API key is not configured")
        name = model_name or get_default_llm_model(provider).name
        return ChatGoogleGenerativeAI(
            model=name,
            api_key=settings.gemini_api_key,
        )
    if provider == Provider.GROK:
        from langchain_openai import ChatOpenAI

        if not settings.grok_api_key or not settings.grok_base_url:
            raise RuntimeError("GROK credentials are not configured")
        name = model_name or get_default_llm_model(provider).name
        return ChatOpenAI(
            model=name,
            api_key=settings.grok_api_key,
            base_url=settings.grok_base_url,
        )
    if provider == Provider.DEEPSEEK:
        from langchain_openai import ChatOpenAI

        if not settings.deepseek_api_key or not settings.deepseek_base_url:
            raise RuntimeError("DEEPSEEK credentials are not configured")
        name = model_name or get_default_llm_model(provider).name
        return ChatOpenAI(
            model=name,
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
    raise ValueError(f"Unsupported provider {provider}")


def get_chat_model(config: AgentModelConfig | None = None) -> BaseChatModel:
    cfg = config or AgentModelConfig()
    if cfg.mode == ModelSelectionMode.MANUAL:
        if not cfg.provider or not cfg.model:
            raise ValueError("Manual mode requires provider and model")
        return create_chat_model(cfg.provider, cfg.model)
    provider_value: Literal["openai", "anthropic", "gemini", "grok", "deepseek"] = settings.llm_provider.lower()  # type: ignore[assignment]
    provider = Provider(provider_value)
    return create_chat_model(provider, cfg.model)


def create_embeddings_model(provider: Provider, model_name: str | None = None) -> Embeddings:
    if provider == Provider.OPENAI:
        from langchain_openai import OpenAIEmbeddings

        if not settings.openai_api_key:
            raise RuntimeError("OPENAI API key is not configured")
        name = model_name or settings.embeddings_model or EMBEDDING_MODELS[provider][0]
        return OpenAIEmbeddings(
            model=name,
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
    if provider == Provider.ANTHROPIC:
        from langchain_anthropic import AnthropicEmbeddings

        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC API key is not configured")
        name = model_name or settings.embeddings_model or EMBEDDING_MODELS[provider][0]
        return AnthropicEmbeddings(
            model=name,
            api_key=settings.anthropic_api_key,
        )
    if provider == Provider.GEMINI:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI API key is not configured")
        name = model_name or settings.embeddings_model or EMBEDDING_MODELS[provider][0]
        return GoogleGenerativeAIEmbeddings(
            model=name,
            api_key=settings.gemini_api_key,
        )
    raise ValueError(f"Unsupported embeddings provider {provider}")


def get_embeddings_model() -> Embeddings:
    provider_value: Literal["openai", "anthropic", "gemini", "grok", "deepseek"] = settings.embeddings_provider.lower()  # type: ignore[assignment]
    provider = Provider(provider_value)
    return create_embeddings_model(provider)
