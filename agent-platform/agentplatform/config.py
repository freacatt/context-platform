from pydantic import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://localhost/context_platform"

    class Config:
        env_prefix = "AGENT_PLATFORM_"
        case_sensitive = False


settings = Settings()

