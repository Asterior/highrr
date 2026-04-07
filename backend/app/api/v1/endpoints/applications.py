from datetime import datetime
from app.db.deps import get_db
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.candidate_profile import CandidateProfile
from app.db.deps import get_db
from app.models.application import Application
from app.models.job import Job
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
)
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=ApplicationResponse)
def apply_job(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can apply")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.job_id == application.job_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already applied")

    # ✅ EVERYTHING BELOW MUST BE INSIDE FUNCTION (indented)

    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()

    candidate_name = current_user.name
    candidate_email = current_user.email
    phone = application.phone
    location = application.location
    cgpa = application.cgpa
    resume_url = application.resume_url
    experience_years = application.experience_years
    skills = application.skills

    if profile:
        candidate_name = profile.full_name or candidate_name
        candidate_email = profile.email or candidate_email
        phone = profile.phone or phone
        location = profile.current_location or location
        cgpa = profile.cgpa or cgpa
        resume_url = profile.resume_url or resume_url
        experience_years = profile.total_experience_years or experience_years

        if hasattr(profile, "skills"):
            skills = [s.skill_name for s in profile.skills]

    db_app = Application(
        user_id=current_user.id,
        job_id=application.job_id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        score=application.score,
        notes=application.notes,
        skills=skills,
        experience_years=experience_years,
        avatar=application.avatar,
        role=application.role,
        location=location,
        phone=phone,
        cgpa=cgpa,
        resume_url=resume_url,
        status_history=[{"status": "applied", "date": datetime.utcnow().isoformat()}],
    )

    db.add(db_app)
    job.application_count = (job.application_count or 0) + 1
    db.commit()
    db.refresh(db_app)

    return db_app

@router.get("/", response_model=list[ApplicationResponse])
def get_applications(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return db.query(Application).all()


@router.get("/me", response_model=list[ApplicationResponse])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["admin", "recruiter", "candidate"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return db.query(Application).filter(
        Application.user_id == current_user.id
    ).all()

VALID_STATUSES = ["applied", "shortlisted", "interview", "selected", "rejected"]
FORWARD_FLOW = ["applied", "shortlisted", "interview", "selected"]


def is_valid_transition(current_status: str, target_status: str) -> bool:
    if current_status == target_status:
        return True

    if target_status == "rejected":
        return True

    if current_status == "rejected":
        return False

    if current_status not in FORWARD_FLOW or target_status not in FORWARD_FLOW:
        return False

    return FORWARD_FLOW.index(target_status) == FORWARD_FLOW.index(current_status) + 1


@router.put("/{application_id}")
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    app = db.query(Application).filter(Application.id == application_id).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if not is_valid_transition(app.status, payload.status):
        raise HTTPException(
            status_code=400,
            detail="Invalid status transition: only next step forward or rejected is allowed",
        )

    app.status = payload.status
    app.assigned_to = payload.assigned_to
    app.notes = payload.notes

    history = app.status_history or []
    history.append({"status": payload.status, "date": datetime.utcnow().isoformat()})
    app.status_history = history

    db.commit()
    db.refresh(app)

    return {"message": "Status updated", "application": app.id, "status": app.status}


@router.get("/job/{job_id}", response_model=list[ApplicationResponse])
def get_applications_by_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return db.query(Application).filter(Application.job_id == job_id).all()