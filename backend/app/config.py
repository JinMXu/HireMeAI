from pydantic import ConfigDict
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-v4-pro"
    llm_request_timeout_seconds: float = 60.0
    llm_max_retries: int = 2
    llm_retry_base_seconds: float = 0.8
    max_file_size_mb: int = 10
    session_ttl_minutes: int = 60

    # CORS — comma-separated list of allowed origins. Defaults to the Vite dev
    # server; override via ALLOWED_ORIGINS in production (e.g. "https://hireme.example.com").
    allowed_origins: str = "http://localhost:5173"

    # LLM capability hints — overridable per model via .env
    model_has_vision: bool = False
    model_has_function_calling: bool = False
    model_has_json_output: bool = True
    model_has_structured_output: bool = False
    model_family: str = "unknown"

    @property
    def model_capabilities(self) -> dict:
        return {
            "vision": self.model_has_vision,
            "function_calling": self.model_has_function_calling,
            "json_output": self.model_has_json_output,
            "structured_output": self.model_has_structured_output,
            "family": self.model_family,
        }


settings = Settings()
