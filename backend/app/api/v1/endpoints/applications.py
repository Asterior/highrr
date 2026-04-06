from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_
from sqlalchemy.orm import Session

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

    db_app = Application(
        user_id=current_user.id,
        job_id=application.job_id,
        candidate_name=current_user.name,
        candidate_email=current_user.email,
        score=application.score,
        notes=application.notes,
        skills=application.skills,
        experience_years=application.experience_years,
        avatar=application.avatar,
        role=application.role,
        location=application.location,
        phone=application.phone,
        cgpa=application.cgpa,
        resume_url=application.resume_url,
        status_history=[{"status": "applied", "date": datetime.utcnow().isoformat()}],
    )

    db.add(db_app)
    job.application_count = (job.application_count or 0) + 1
    db.commit()
    db.refresh(db_app)

    return db_app


@router.get("/", response_model=list[ApplicationResponse])
def get_applications(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    status: str = Query(None, description="Filter by application status"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get applications for recruiter's jobs with pagination and filtering.
    
    Optimization:
    - For recruiters: Only shows applicants to jobs they posted (via JOIN with Job table)
    - For admins: Shows all applications
    - Database-level filtering for better performance
    - Indexes on job_id, status, user_id for fast queries
    """
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = db.query(Application)
    
    # Filter by recruiter's jobs (only for recruiters, admins see all)
    if current_user.role == "recruiter":
        recruiter_job_ids = db.query(Job.id).filter(
            Job.created_by == current_user.id
        ).subquery()
        query = query.filter(Application.job_id.in_(recruiter_job_ids))
    
    # Apply status filter
    if status:
        query = query.filter(Application.status == status)
    
    # Order by applied date (most recent first) and apply pagination
    applications = query.order_by(Application.applied_at.desc()).offset(skip).limit(limit).all()
    
    return applications


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
    """Update application status. Recruiters can only update applications for their own jobs."""
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    app = db.query(Application).filter(Application.id == application_id).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Verify recruiter can only update applications for their own jobs
    if current_user.role == "recruiter":
        job = db.query(Job).filter(Job.id == app.job_id).first()
        if not job or job.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot update application for job not created by you")

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
    """Get applications for a specific job. Recruiters can only view their own jobs."""
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Verify recruiter can only view applications for their own jobs
    if current_user.role == "recruiter" and job.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot view applications for job not created by you")

    return db.query(Application).filter(Application.job_id == job_id).all()