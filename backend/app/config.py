from pydantic import ConfigDict
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-v4-pro"
    max_file_size_mb: int = 10
    session_ttl_minutes: int = 60

    # LLM capability hints — overridable per model via .env
    model_has_vision: bool = False
    model_has_function_calling: bool = False
    model_has_json_output: bool = True
    model_family: str = "unknown"

    @property
    def model_capabilities(self) -> dict:
        return {
            "vision": self.model_has_vision,
            "function_calling": self.model_has_function_calling,
            "json_output": self.model_has_json_output,
            "family": self.model_family,
        }


settings = Settings()
