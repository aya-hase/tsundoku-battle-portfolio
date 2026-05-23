# 環境変数管理
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    RAKUTEN_APP_ID: str
    RAKUTEN_ACCESS_KEY: str
    RAKUTEN_AFFILIATE_ID: str | None = None
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str # これを追記
    OPENAI_API_KEY: str # 追記

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
