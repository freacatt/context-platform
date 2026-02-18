from pydantic import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://localhost/context_platform"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None
    llm_provider: str = "anthropic"
    llm_model: str = "claude-3-5-sonnet-20241022"
    embeddings_provider: str = "anthropic"
    embeddings_model: str = "text-embedding-3-large"
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    openai_base_url: str | None = None
    gemini_api_key: str | None = None
    grok_api_key: str | None = None
    grok_base_url: str | None = None
    deepseek_api_key: str | None = None
    deepseek_base_url: str | None = None

    class Config:
        env_prefix = "AGENT_PLATFORM_"
        case_sensitive = False


settings = Settings()

