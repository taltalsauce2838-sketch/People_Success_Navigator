from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Pulse Survey App"
    DATABASE_URL: str
    DIFY_API_KEY: Optional[str] = None
    DIFY_API_KEY2: Optional[str] = None

    # .env ファイルの読み込み設定
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore" # .envに余計な変数があってもエラーにしない
    )

settings = Settings()