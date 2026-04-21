"""Reusable API dependencies for auth and role guards."""

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import verify_access_token
from app.db.deps import get_db
from app.models.company_verification import CompanyVerification
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Resolves and returns the authenticated user from the access token."""
    try:
        payload = verify_access_token(token)
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(required_role: str):
    """Builds a role checker dependency for a single allowed role."""

    def role_checker(current_user=Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(status_code=403, detail="Not authorized")
        return current_user

    return role_checker


def get_verified_recruiter(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Dependency for recruiter-only endpoints requiring company verification."""
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiter role required")

    verification = (
        db.query(CompanyVerification)
        .filter(CompanyVerification.recruiter_id == current_user.id)
        .first()
    )
    level = (verification.verification_level if verification else "").lower()
    if level not in {"verified", "trusted"}:
        raise HTTPException(status_code=403, detail="Company verification required to perform this action")
    return current_user


def get_admin(current_user=Depends(get_current_user)):
    """Dependency for admin-only endpoints."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
