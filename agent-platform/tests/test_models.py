"""Tests for GET /models endpoint."""


def test_list_models(client):
    """Should return all providers with their models."""
    resp = client.get("/models")
    assert resp.status_code == 200

    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Check structure of each provider
    provider_values = set()
    for provider in data:
        assert "value" in provider
        assert "label" in provider
        assert "models" in provider
        assert isinstance(provider["models"], list)
        assert len(provider["models"]) > 0
        provider_values.add(provider["value"])

        # Check model structure
        for model in provider["models"]:
            assert "value" in model
            assert "label" in model
            assert "context_window" in model

    # Verify all expected providers are present
    assert "openai" in provider_values
    assert "anthropic" in provider_values
    assert "gemini" in provider_values
    assert "grok" in provider_values
    assert "deepseek" in provider_values


def test_models_provider_labels(client):
    """Provider labels should be human-readable."""
    resp = client.get("/models")
    data = resp.json()
    labels = {p["value"]: p["label"] for p in data}
    assert labels["openai"] == "OpenAI"
    assert labels["anthropic"] == "Anthropic"
    assert labels["gemini"] == "Google Gemini"
    assert labels["deepseek"] == "DeepSeek"
