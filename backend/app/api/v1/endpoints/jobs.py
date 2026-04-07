from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=JobResponse)
def create_job(
    job: JobCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new job posting. Admin and Recruiter only."""
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

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
        status=job.status,
        is_active=job.is_active,
        created_by=current_user.id,
    )

    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    return db_job


@router.get("/", response_model=list[JobResponse])
def get_jobs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    is_active: bool = Query(True, description="Filter by active status"),
    department: str = Query(None, description="Filter by department"),
    status: str = Query(None, description="Filter by job status"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all jobs with pagination and filtering.
    - Admins: See all jobs
    - Recruiters: See only their own posted jobs
    - Candidates: See all active jobs
    
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
    elif current_user.role == "candidate":
        # Candidates only see active jobs
        query = query.filter(Job.is_active == True)
    # Admins see all jobs
    
    # Apply filters
    if not (current_user.role == "candidate"):
        query = query.filter(Job.is_active == is_active)
    
    if department:
        query = query.filter(Job.department == department)
    
    if status:
        query = query.filter(Job.status == status)
    
    # Order by most recent first and apply pagination
    jobs = query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    
    return jobs


@router.get("/{job_id}", response_model=JobResponse)
def get_job_detail(job_id: int, db: Session = Depends(get_db)):
    """Get a specific job by ID."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


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

    # Only update fields that are explicitly provided
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


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