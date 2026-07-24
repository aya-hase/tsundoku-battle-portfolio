import os
import logging
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qsgmxiapymejnqydfruj.supabase.co").rstrip("/")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
ISSUER_URL = f"{SUPABASE_URL}/auth/v1"

jwks_client = PyJWKClient(JWKS_URL)
security = HTTPBearer()

async def get_current_user(auth: HTTPAuthorizationCredentials = Security(security)):
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(auth.credentials)
        payload = jwt.decode(
            auth.credentials,
            signing_key.key,
            algorithms=["ES256"],
            issuer=ISSUER_URL,
            audience="authenticated",
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="トークン期限切れ")

    except Exception as e:
        logger.warning("Auth error: %s", e)
        raise HTTPException(status_code=401, detail="認証に失敗しました")