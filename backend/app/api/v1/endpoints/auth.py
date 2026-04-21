import os

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.core.rate_limit import limiter
from app.core.sanitize import sanitize_string
from app.db.deps import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    validate_password_strength,
    verify_password,
)

router = APIRouter()


@router.post("/login")
@limiter.limit(f"{os.getenv('RATE_LIMIT_LOGIN', '5')}/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email")

    if not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid password")

    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "id": user.id
    })
    refresh_token = create_refresh_token({"sub": user.email, "role": user.role, "id": user.id})

    return {
        "access_token": token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/register", response_model=UserResponse)
@limiter.limit(f"{os.getenv('RATE_LIMIT_REGISTER', '3')}/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    validate_password_strength(payload.password)
    user = User(
        name=sanitize_string(payload.name, 120),
        email=sanitize_string(payload.email, 255).lower(),
        password=hash_password(payload.password),
        role=sanitize_string(payload.role, 50),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
