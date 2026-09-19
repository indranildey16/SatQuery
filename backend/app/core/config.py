from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "SatQuery AI API"
    APP_VERSION: str = "v2.4-ORBIT"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    INFERENCE_MODE: str = "mock"
    COLAB_INFERENCE_URL: str = ""
    COLAB_INFERENCE_TOKEN: str = ""
    TIMEOUT_SECONDS: int = 120
    MAX_UPLOAD_SIZE_MB: int = 50
    UPLOAD_DIR: str = "./data/uploads"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
