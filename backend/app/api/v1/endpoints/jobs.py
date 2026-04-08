from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.job_status import (
    applications_label,
    candidate_job_status,
    can_accept_applications,
    deadline_has_passed,
    normalize_job_status,
    recruiter_job_status,
)
from app.db.deps import get_db
from app.models.application import Application
from app.models.job import Job
from app.schemas.job import JobCreate, JobResponse, JobUpdate

router = APIRouter()

VALID_BASE_STATUSES = {"active", "inactive"}


def _build_job_response(
    job: Job,
    *,
    current_user,
    applications: list[Application],
) -> dict:
    application_count = len(applications)
    has_applied = current_user.role == "candidate" and any(
        app.user_id == current_user.id for app in applications
    )
    has_pending_applications = any(
        app.status not in {"selected", "rejected"} for app in applications
    )
    deadline_passed = deadline_has_passed(job.application_deadline)

    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "location": job.location,
        "salary": job.salary,
        "job_type": job.job_type,
        "required_skills": job.required_skills or [],
        "experience_required": job.experience_required,
        "is_active": job.is_active,
        "application_deadline": job.application_deadline,
        "created_by": job.created_by,
        "application_count": application_count,
        "department": job.department,
        "status": normalize_job_status(job.is_active),
        "recruiter_status": recruiter_job_status(
            is_active=job.is_active,
            application_deadline=job.application_deadline,
            application_count=application_count,
            has_pending_applications=has_pending_applications,
        ),
        "candidate_status": candidate_job_status(
            is_active=job.is_active,
            application_deadline=job.application_deadline,
            has_applied=has_applied,
        ),
        "has_applied": has_applied,
        "can_apply": can_accept_applications(job.is_active, job.application_deadline) and not has_applied,
        "deadline_passed": deadline_passed,
        "applications_label": applications_label(application_count),
        "created_at": job.created_at,
    }


def _get_job_applications_map(db: Session, job_ids: list[int]) -> dict[int, list[Application]]:
    if not job_ids:
        return {}

    applications = db.query(Application).filter(Application.job_id.in_(job_ids)).all()
    applications_map: dict[int, list[Application]] = {job_id: [] for job_id in job_ids}

    for application in applications:
        applications_map.setdefault(application.job_id, []).append(application)

    return applications_map


def _resolve_active_filters(is_active: bool | None, status: str | None) -> tuple[bool | None, str | None]:
    normalized_status = status.strip().lower() if status else None

    if normalized_status and normalized_status not in VALID_BASE_STATUSES:
        raise HTTPException(status_code=400, detail="Job status must be Active or Inactive")

    if normalized_status == "active":
        return True, "Active"
    if normalized_status == "inactive":
        return False, "Inactive"

    if is_active is None:
        return None, None

    return is_active, normalize_job_status(is_active)


@router.post("/", response_model=JobResponse)
def create_job(
    job: JobCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new job posting. Admin and Recruiter only."""
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if job.application_deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Application deadline must be in the future")

    resolved_is_active, resolved_status = _resolve_active_filters(job.is_active, job.status)
    is_active = True if resolved_is_active is None else resolved_is_active

    db_job = Job(
        title=job.title,
        description=job.description,
        location=job.location,
        salary=job.salary,
        job_type=job.job_type,
        required_skills=job.required_skills,
        experience_required=job.experience_required,
        application_count=job.application_count,
        department=job.department,
        status=resolved_status or normalize_job_status(is_active),
        is_active=is_active,
        application_deadline=job.application_deadline,
        created_by=current_user.id,
    )

    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    return _build_job_response(db_job, current_user=current_user, applications=[])


@router.get("/", response_model=list[JobResponse])
def get_jobs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    department: str = Query(None, description="Filter by department"),
    status: str = Query(None, description="Filter by job status"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all jobs with pagination and filtering.
    - Admins: See all jobs
    - Recruiters: See only their own posted jobs
    - Candidates: See all jobs with candidate-specific availability labels
    
    Optimized query with:
    - Pagination (skip/limit)
    - Filtering by is_active, department, status
    - Ordered by most recent first
    - Database-level filtering for performance
    """
    query = db.query(Job)
    
    # Role-based filtering
    if current_user.role == "recruiter":
        # Recruiters only see jobs they created
        query = query.filter(Job.created_by == current_user.id)
    # Admins see all jobs

    resolved_is_active, resolved_status = _resolve_active_filters(is_active, status)

    # Apply filters
    if current_user.role != "candidate" and resolved_is_active is not None:
        query = query.filter(Job.is_active == resolved_is_active)

    if department:
        query = query.filter(Job.department == department)

    if current_user.role != "candidate" and resolved_status:
        query = query.filter(Job.status == resolved_status)

    # Order by most recent first and apply pagination
    jobs = query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()

    applications_map = _get_job_applications_map(db, [job.id for job in jobs])
    return [
        _build_job_response(
            job,
            current_user=current_user,
            applications=applications_map.get(job.id, []),
        )
        for job in jobs
    ]


@router.get("/{job_id}", response_model=JobResponse)
def get_job_detail(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a specific job by ID."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    return _build_job_response(job, current_user=current_user, applications=applications)


@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    payload: JobUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a job posting. Admin and Recruiter only."""
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data or "is_active" in update_data:
        resolved_is_active, resolved_status = _resolve_active_filters(
            update_data.get("is_active"),
            update_data.get("status"),
        )
        if resolved_is_active is not None:
            update_data["is_active"] = resolved_is_active
            update_data["status"] = resolved_status or normalize_job_status(resolved_is_active)

    # Only update fields that are explicitly provided
    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    return _build_job_response(job, current_user=current_user, applications=applications)


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a job posting. Admin and Recruiter only. Cannot delete jobs with active applications."""
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Prevent deletion of jobs with applications
    if job.application_count > 0:
        raise HTTPException(
            status_code=409, 
            detail=f"Cannot delete job with {job.application_count} active application(s). Please review or reject all applications before deleting."
        )

    db.delete(job)
    db.commit()

    return {"message": "Job deleted successfully"}
