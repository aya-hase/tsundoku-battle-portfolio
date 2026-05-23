# Spabase通信用
from app.core.config import settings


def get_headers():
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def get_rest_url(table: str):
    return f"{settings.SUPABASE_URL}rest/v1/{table}"
