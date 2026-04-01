from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationResponse
from app.api.deps import get_current_user

router = APIRouter()


# 🔹 APPLY TO JOB
@router.post("/", response_model=ApplicationResponse)
def apply_job(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 🚫 Prevent duplicate application
    existing = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.job_id == application.job_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already applied")

    db_app = Application(
        user_id=current_user.id,
        job_id=application.job_id
    )

    db.add(db_app)
    db.commit()
    db.refresh(db_app)

    return db_app


# 🔹 GET ALL APPLICATIONS (admin/recruiter)
@router.get("/", response_model=list[ApplicationResponse])
def get_applications(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return db.query(Application).all()


# 🔹 GET MY APPLICATIONS (candidate view)
@router.get("/me", response_model=list[ApplicationResponse])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Application).filter(
        Application.user_id == current_user.id
    ).all()

VALID_STATUSES = ["applied", "shortlisted", "interview", "selected", "rejected"]
# 🔹 UPDATE STATUS (pipeline movement)
@router.put("/{application_id}")
def update_application_status(
    application_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    app = db.query(Application).filter(Application.id == application_id).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = status

    db.commit()

    return {"message": "Status updated"}