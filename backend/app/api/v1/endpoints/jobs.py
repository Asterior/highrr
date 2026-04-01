from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobResponse
from app.api.deps import get_current_user

router = APIRouter()


# 🔹 CREATE JOB (admin + recruiter only)
@router.post("/", response_model=JobResponse)
def create_job(
    job: JobCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
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
        created_by=current_user.id
    )

    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    return db_job


# 🔹 GET ALL JOBS (all roles)
@router.get("/", response_model=list[JobResponse])
def get_jobs(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Job).all()


# 🔹 DELETE JOB (admin only)
@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()

    return {"message": "Job deleted"}