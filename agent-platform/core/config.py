from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AGENT_PLATFORM_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Firebase / Firestore
    firebase_credentials_path: str | None = None  # path to service account JSON; falls back to GOOGLE_APPLICATION_CREDENTIALS

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None
    qdrant_vector_size: int = 1536  # default embedding dimension

    # LLM
    llm_provider: str = "anthropic"
    llm_model: str = "claude-3-5-sonnet-20241022"

    # Embeddings
    embeddings_provider: str = "anthropic"
    embeddings_model: str = "text-embedding-3-large"

    # Provider API keys
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    openai_base_url: str | None = None
    gemini_api_key: str | None = None
    grok_api_key: str | None = None
    grok_base_url: str | None = None
    deepseek_api_key: str | None = None
    deepseek_base_url: str | None = None

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"


settings = Settings()
