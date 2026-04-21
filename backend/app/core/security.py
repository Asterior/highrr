"""Owns all auth cryptography for the platform."""

import os
import re
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY is missing or too weak. Minimum 32 characters.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hashes a plain-text password using bcrypt.

    Args:
        password: Raw password string.

    Returns:
        The bcrypt-hashed password.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against a bcrypt hash.

    Args:
        plain_password: Raw password string.
        hashed_password: Stored bcrypt hash.

    Returns:
        True when the password matches, otherwise False.
    """
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_strength(password: str) -> None:
    """Validates password complexity policy and raises ValueError on failure.

    Args:
        password: Password string to validate.

    Returns:
        None.
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must include at least one uppercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must include at least one digit")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}]", password):
        raise ValueError("Password must include at least one special character")


def create_access_token(data: dict) -> str:
    """Creates a signed JWT access token.

    Args:
        data: Claims payload to include.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Creates a signed JWT refresh token.

    Args:
        data: Claims payload to include.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "iat": now, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> dict:
    """Decodes and validates an access token.

    Args:
        token: JWT string.

    Returns:
        Decoded claims payload.
    """
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("type") != "access":
        raise JWTError("Invalid token type")
    return payload


def verify_refresh_token(token: str) -> dict:
    """Decodes and validates a refresh token.

    Args:
        token: JWT string.

    Returns:
        Decoded claims payload.
    """
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("type") != "refresh":
        raise JWTError("Invalid token type")
    return payload