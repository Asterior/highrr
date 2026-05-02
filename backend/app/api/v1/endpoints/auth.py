import logging
import os
import random
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.sanitize import sanitize_string
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.db.deps import get_db
from app.models.company_verification import CompanyVerification
from app.models.user import User
from app.services.employer_verification import run_verification
from app.schemas.auth import SendOtpResponse, VerifyOtpRequest, VerifyOtpResponse
from app.schemas.user import UserCreate, UserResponse

router = APIRouter()
LOGGER = logging.getLogger(__name__)
FREE_EMAIL_DOMAINS = {"yahoo.com", "outlook.com", "hotmail.com", "proton.me", "protonmail.com"}
_OTP_STORE: dict[int, tuple[str, datetime]] = {}
_OTP_EXPIRY_MINUTES = 10


def _normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


def _is_free_email(email: str | None) -> bool:
    normalized = _normalize_email(email)
    if "@" not in normalized:
        return True
    return normalized.split("@", 1)[1] in FREE_EMAIL_DOMAINS


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _get_company_verification(db: Session, recruiter_id: int) -> CompanyVerification | None:
    return db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter_id).first()


def _ensure_recruiter_company_email(current_user, db: Session) -> CompanyVerification:
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiter role required")

    company = _get_company_verification(db, current_user.id)
    if not company or not company.company_email:
        raise HTTPException(status_code=404, detail="Verification profile not found")

    if _is_free_email(company.company_email):
        raise HTTPException(status_code=400, detail="Company email must use a business domain")

    return company


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


@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = _ensure_recruiter_company_email(current_user, db)
    otp = _generate_otp()
    _OTP_STORE[current_user.id] = (otp, datetime.utcnow() + timedelta(minutes=_OTP_EXPIRY_MINUTES))
    LOGGER.info("Generated OTP for recruiter_id=%s company_email=%s", current_user.id, company.company_email)
    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    return SendOtpResponse(
        email=company.company_email,
        expires_in_seconds=_OTP_EXPIRY_MINUTES * 60,
        message="OTP generated and stored for verification",
        otp_code=otp if environment == "development" else None,
    )


@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(
    payload: VerifyOtpRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _ensure_recruiter_company_email(current_user, db)
    stored = _OTP_STORE.get(current_user.id)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not requested")

    otp, expires_at = stored
    if datetime.utcnow() > expires_at:
        _OTP_STORE.pop(current_user.id, None)
        raise HTTPException(status_code=400, detail="OTP expired")

    if payload.otp.strip() != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    company.email_verified = True
    company.review_status = company.review_status or "draft"
    company.updated_at = datetime.utcnow()
    db.commit()
    run_verification(
        recruiter_id=current_user.id,
        gst=company.business_registry_id or "",
        company_email=company.company_email or "",
        company_website=company.website_url or company.company_domain or "",
        linkedin_url=company.linkedin_company_url or "",
        db=db,
    )
    db.refresh(company)
    _OTP_STORE.pop(current_user.id, None)

    return VerifyOtpResponse(
        email=company.company_email,
        email_verified=True,
        message="Email verified successfully",
    )
