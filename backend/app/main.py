import os
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.security import hash_password
from app.db.session import engine, get_db
from app.db.base import Base
from fastapi import Depends
from sqlalchemy.orm import Session
from app.models import user
from app.api.v1.endpoints import users
from app.api.v1.endpoints import auth
from app.models import job
from app.api.v1.endpoints import jobs
from app.models import application
from app.api.v1.endpoints import applications
from app.models import interview
from app.models import conversation
from app.models import message
from app.models import candidate_profile
from app.models import company_verification
from app.models import recruiter_reputation
from app.models import user_report
from app.api.v1.endpoints import interviews
from app.api.v1.endpoints import messages
from app.api.v1.endpoints import analytics
from app.api.v1.endpoints import candidate_profile as candidate_profile_routes
from app.api.v1.endpoints import file_upload
from app.api.v1.endpoints import trust
from app.models.company_verification import CompanyVerification
from app.models.user import User

from app.api.v1.endpoints.websocket import router as ws_router

app = FastAPI()

default_origins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", ",".join(default_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _apply_schema_compatibility_patches() -> None:
    dialect = engine.dialect.name
    with engine.begin() as conn:
        Base.metadata.tables["company_verifications"].create(bind=conn, checkfirst=True)
        Base.metadata.tables["recruiter_reputations"].create(bind=conn, checkfirst=True)
        Base.metadata.tables["user_reports"].create(bind=conn, checkfirst=True)

        conn.execute(text("ALTER TABLE company_verifications ADD COLUMN IF NOT EXISTS admin_notes TEXT"))
        conn.execute(text("ALTER TABLE company_verifications ADD COLUMN IF NOT EXISTS pending_payload TEXT"))
        conn.execute(text("ALTER TABLE company_verifications ADD COLUMN IF NOT EXISTS review_status VARCHAR DEFAULT 'draft'"))
        conn.execute(text("ALTER TABLE company_verifications ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE company_verifications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE company_verifications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP"))

        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS responsibilities TEXT"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hiring_timeline VARCHAR"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actively_hiring BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS intent_confirmed_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_expires_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS renewed_count INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recruiter_response_rate INTEGER DEFAULT 100"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE"))

        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fraud_flags JSONB DEFAULT '[]'::jsonb"))
        else:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fraud_flags JSON"))

        application_columns = [
            ("candidate_profile_id", "INTEGER"),
            ("candidate_location", "TEXT"),
            ("current_role", "TEXT"),
            ("current_company", "TEXT"),
            ("highest_qualification", "TEXT"),
            ("profile_completion_percentage", "INTEGER"),
        ]

        for column_name, column_type in application_columns:
            existing = conn.execute(
                text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = 'applications' AND column_name = :column"
                ),
                {"column": column_name},
            ).first()
            if not existing:
                conn.execute(text(f"ALTER TABLE applications ADD COLUMN {column_name} {column_type}"))


def _ensure_demo_recruiter() -> None:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "fresh.recruiter@demohr.com").first()
        if not existing:
            db.add(
                User(
                    name="Fresh Recruiter",
                    email="fresh.recruiter@demohr.com",
                    password=hash_password("FreshRecruiter123"),
                    role="recruiter",
                )
            )
            db.commit()
    finally:
        db.close()


def _ensure_recruiter_trust_override(email: str, score: int = 90) -> None:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        recruiter = db.query(User).filter(User.email == email, User.role == "recruiter").first()
        if not recruiter:
            return

        verification = (
            db.query(CompanyVerification)
            .filter(CompanyVerification.recruiter_id == recruiter.id)
            .first()
        )

        if not verification:
            verification = CompanyVerification(
                recruiter_id=recruiter.id,
                company_name="Verified Recruiter",
                company_email=email,
                verification_level="verified",
                trust_score=score,
                domain_verified=True,
                domain_otp_verified=True,
                office_proof_verified=True,
                last_assessed_at=datetime.utcnow(),
            )
            db.add(verification)
        else:
            verification.verification_level = "verified"
            verification.trust_score = max(score, verification.trust_score or 0)
            verification.domain_verified = True
            verification.domain_otp_verified = True
            verification.office_proof_verified = True
            verification.last_assessed_at = datetime.utcnow()

        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def startup_create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    _apply_schema_compatibility_patches()
    _ensure_demo_recruiter()
    _ensure_recruiter_trust_override("ananya@gmail.com", score=92)


app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(interviews.router, prefix="/interviews", tags=["Interviews"])
app.include_router(messages.router, tags=["Messages"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(candidate_profile_routes.router)
app.include_router(file_upload.router)
app.include_router(trust.router, prefix="/trust", tags=["Trust"])
app.include_router(ws_router)

@app.get("/")
def root():
    return {"message": "Highrr Employer Backend Running 🚀"}

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    return {"msg": "DB connected"}