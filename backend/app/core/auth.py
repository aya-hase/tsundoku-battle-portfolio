import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

JWKS_URL = "https://qsgmxiapymejnqydfruj.supabase.co/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(JWKS_URL)

security = HTTPBearer()

async def get_current_user(auth: HTTPAuthorizationCredentials = Security(security)):
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(auth.credentials)

        payload = jwt.decode(
            auth.credentials,
            signing_key.key,
            algorithms=["ES256"],
            issuer="https://qsgmxiapymejnqydfruj.supabase.co/auth/v1",
            audience="authenticated",
        )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="トークン期限切れ")

    except Exception as e:
        print("Auth error:", e)
        raise HTTPException(status_code=401, detail=str(e))
