from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserResponse
from app.models.user import User
from app.db.deps import get_db
from app.api.deps import get_current_user
from app.core.sanitize import sanitize_string
from app.core.security import hash_password, validate_password_strength
from app.api.deps import require_role

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    validate_password_strength(user.password)
    db_user = User(
        name=sanitize_string(user.name, 120),
        email=sanitize_string(user.email, 255).lower(),
        password=hash_password(user.password),
        role=sanitize_string(user.role, 50)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    return db.query(User).all()