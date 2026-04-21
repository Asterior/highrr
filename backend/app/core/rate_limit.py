"""Rate limiting utilities shared across route modules."""

import os

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import verify_access_token


def user_rate_limit_key(request: Request) -> str:
    """Returns user id when available, otherwise falls back to remote IP."""
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = verify_access_token(token)
            user_id = payload.get("id")
            if user_id is not None:
                return f"user:{user_id}"
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[os.getenv("RATE_LIMIT_DEFAULT", "60/minute")],
)
