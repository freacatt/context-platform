from fastapi import APIRouter

from ai.models import LLM_MODELS, Provider

router = APIRouter(prefix="/models", tags=["models"])

_PROVIDER_LABELS: dict[str, str] = {
    Provider.OPENAI.value: "OpenAI",
    Provider.ANTHROPIC.value: "Anthropic",
    Provider.GEMINI.value: "Google Gemini",
    Provider.GROK.value: "Grok",
    Provider.DEEPSEEK.value: "DeepSeek",
}


@router.get("")
def list_models():
    """Return all available LLM providers and their models."""
    providers = []
    for provider, models in LLM_MODELS.items():
        providers.append({
            "value": provider.value,
            "label": _PROVIDER_LABELS.get(provider.value, provider.value),
            "models": [
                {
                    "value": m.name,
                    "label": m.label,
                    "context_window": m.context_window,
                }
                for m in models
            ],
        })
    return providers
