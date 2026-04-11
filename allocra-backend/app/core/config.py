from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    DATABASE_URL: str
    APP_ENV: str = "development"

    class Config:
        env_file = Path(__file__).resolve().parent.parent.parent / ".env"
        env_file_encoding = "utf-8"

settings = Settings()
