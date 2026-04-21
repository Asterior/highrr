from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.errors import bad_request, forbidden, not_found
from app.core.sanitize import sanitize_string
from app.core.resume_parser import extract_job_signals, extract_text_from_file
from app.db.deps import get_db
from app.db.session import SessionLocal
from app.models.application import Application
from app.models.candidate_profile import CandidateProfile
from app.models.company_verification import CompanyVerification
from app.models.job import Job
from app.services.alert_engine import process_alerts_for_job
from app.services.match_score import calculate_match_score
from app.schemas.job import JobCreate, JobResponse, JobUpdate

router = APIRouter()


def _dispatch_alerts_for_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        process_alerts_for_job(job_id, db)
    finally:
        db.close()


def _to_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _verification_for_recruiter(db: Session, recruiter_id: int) -> tuple[str, int]:
    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter_id).first()
    if not company:
        return "basic", 0
    return company.verification_level or "basic", company.trust_score or 0


def _build_job_response(job: Job, *, current_user, applications: list[Application], db: Session) -> dict:
    application_count = len(applications)
    has_applied = current_user.role == "candidate" and any(app.user_id == current_user.id for app in applications)
    now = datetime.utcnow()
    deadline_passed = bool(job.application_deadline and _to_utc_naive(job.application_deadline) <= now)
    posting_expired = bool(job.posted_expires_at and _to_utc_naive(job.posted_expires_at) <= now)
    is_open_now = bool(job.is_active) and not deadline_passed and not posting_expired
    can_apply = current_user.role == "candidate" and is_open_now and not has_applied

    if deadline_passed:
        recruiter_status = "Deadline Passed"
    elif posting_expired:
        recruiter_status = "Expired"
    else:
        recruiter_status = "Active" if bool(job.is_active) else "Inactive"

    if has_applied:
        candidate_status = "Applied"
    elif can_apply:
        candidate_status = "Active"
    else:
        candidate_status = "Closed"

    level, score = _verification_for_recruiter(db, job.created_by)

    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "location": job.location,
        "salary": job.salary,
        "job_type": job.job_type,
        "responsibilities": job.responsibilities,
        "hiring_timeline": job.hiring_timeline,
        "actively_hiring": bool(job.actively_hiring),
        "required_skills": job.required_skills or [],
        "experience_required": job.experience_required,
        "is_active": bool(job.is_active),
        "application_deadline": job.application_deadline,
        "posted_expires_at": job.posted_expires_at,
        "renewed_count": job.renewed_count or 0,
        "created_by": job.created_by,
        "application_count": application_count,
        "department": job.department,
        "status": job.status,
        "recruiter_response_rate": job.recruiter_response_rate or 0,
        "is_flagged": bool(job.is_flagged),
        "fraud_flags": job.fraud_flags or [],
        "company_verification_level": level,
        "company_trust_score": score,
        "recruiter_status": recruiter_status,
        "candidate_status": candidate_status,
        "has_applied": has_applied,
        "can_apply": can_apply,
        "deadline_passed": deadline_passed,
        "applications_label": f"{application_count} applications" if application_count else "No applications received",
        "created_at": job.created_at,
    }


@router.post("/extract-jd")
async def extract_job_description_fields(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    filename = (file.filename or "").lower()
    if not (filename.endswith(".pdf") or filename.endswith(".doc") or filename.endswith(".docx") or filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only PDF, DOC, DOCX, and TXT files are supported")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded JD file is empty")

    # Use a temp file so parser can handle PDF/DOCX.
    import tempfile
    import os

    ext = "." + filename.split(".")[-1] if "." in filename else ".txt"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name

    try:
        text = extract_text_from_file(tmp_path)
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from JD file")

    parsed = extract_job_signals(text)
    return {
        "parsed": parsed,
    }


@router.post("/", response_model=JobResponse)
async def create_job(
    job: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if current_user.role == "recruiter":
        level, _score = _verification_for_recruiter(db, current_user.id)
        if level not in {"verified", "trusted"}:
            raise HTTPException(
                status_code=403,
                detail="Complete company verification first to post jobs",
            )

    if not job.salary or job.salary.strip().lower() in {"competitive", "negotiable", "na"}:
        raise HTTPException(status_code=400, detail="Salary range is mandatory and cannot be vague")

    if not job.responsibilities or len(job.responsibilities.strip()) < 30:
        raise HTTPException(status_code=400, detail="Detailed role responsibilities are required")

    if not job.hiring_timeline or len(job.hiring_timeline.strip()) < 5:
        raise HTTPException(status_code=400, detail="Hiring timeline is required")

    if not job.actively_hiring:
        raise HTTPException(status_code=400, detail="Hiring intent confirmation is required")

    posted_expires_at = datetime.utcnow() + timedelta(days=30)
    if job.application_deadline and _to_utc_naive(job.application_deadline) > posted_expires_at:
        raise HTTPException(status_code=400, detail="Application deadline must be within 30 days of posting")

    clean_title = sanitize_string(job.title, 200)
    clean_description = sanitize_string(job.description, 4000)
    clean_location = sanitize_string(job.location or "", 200) or None
    clean_salary = sanitize_string(job.salary, 100)
    clean_job_type = sanitize_string(job.job_type, 100)
    clean_responsibilities = sanitize_string(job.responsibilities, 4000)
    clean_timeline = sanitize_string(job.hiring_timeline, 300)
    clean_department = sanitize_string(job.department or "", 120) or None
    clean_experience = sanitize_string(job.experience_required or "", 120) or None
    clean_status = sanitize_string(job.status, 50)

    db_job = Job(
        title=clean_title,
        description=clean_description,
        location=clean_location,
        salary=clean_salary,
        job_type=clean_job_type,
        responsibilities=clean_responsibilities,
        hiring_timeline=clean_timeline,
        actively_hiring=job.actively_hiring,
        intent_confirmed_at=datetime.utcnow(),
        required_skills=job.required_skills,
        experience_required=clean_experience,
        application_count=job.application_count,
        department=clean_department,
        status=clean_status,
        is_active=job.is_active,
        application_deadline=job.application_deadline,
        posted_expires_at=posted_expires_at,
        created_by=current_user.id,
    )

    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    # Run alert dispatch after response without blocking job creation.
    if db_job.is_active:
        background_tasks.add_task(_dispatch_alerts_for_job, db_job.id)

    return _build_job_response(db_job, current_user=current_user, applications=[], db=db)


@router.get("/", response_model=list[JobResponse])
def get_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    is_active: bool | None = None,
    department: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Job)

    if current_user.role == "recruiter":
        query = query.filter(Job.created_by == current_user.id)
    elif current_user.role == "candidate":
        query = query.filter(Job.is_active == True)  # noqa: E712
        query = query.filter((Job.posted_expires_at == None) | (Job.posted_expires_at > datetime.utcnow()))  # noqa: E711

    if is_active is not None:
        query = query.filter(Job.is_active == is_active)
    if department:
        query = query.filter(Job.department == department)
    if status:
        query = query.filter(Job.status == status)

    jobs = query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()

    now = datetime.utcnow()
    touched = False
    for job in jobs:
        if job.posted_expires_at and job.posted_expires_at <= now and job.is_active:
            job.is_active = False
            job.status = "Inactive"
            touched = True
    if touched:
        db.commit()

    job_ids = [job.id for job in jobs]
    apps = db.query(Application).filter(Application.job_id.in_(job_ids)).all() if job_ids else []
    app_map: dict[int, list[Application]] = {}
    for app in apps:
        app_map.setdefault(app.job_id, []).append(app)

    return [
        _build_job_response(job, current_user=current_user, applications=app_map.get(job.id, []), db=db)
        for job in jobs
    ]


@router.get("/{job_id}", response_model=JobResponse)
def get_job_detail(job_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    return _build_job_response(job, current_user=current_user, applications=applications, db=db)


@router.get("/{job_id}/match-score")
def get_job_match_score(job_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Returns candidate-to-job match score breakdown for the selected job."""
    if current_user.role != "candidate":
        forbidden("Candidate role required")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        not_found("Job")

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        bad_request("Complete your profile before viewing match scores")

    candidate_payload = {
        "city": profile.city,
        "state": profile.state,
        "current_location": profile.current_location,
        "total_experience_years": profile.total_experience_years,
        "expected_salary": profile.expected_salary,
        "skills": [{"skill_name": s.skill_name} for s in (profile.skills or [])],
    }
    job_payload = {
        "required_skills": job.required_skills or [],
        "experience_required": job.experience_required,
        "location": job.location,
        "salary": job.salary,
        "is_remote": getattr(job, "is_remote", False),
    }
    return calculate_match_score(candidate_payload, job_payload)


@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    payload: JobUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user.role == "recruiter" and job.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit jobs posted by other recruiters")

    update_data = payload.model_dump(exclude_unset=True)

    if "salary" in update_data and update_data["salary"]:
        if update_data["salary"].strip().lower() in {"competitive", "negotiable", "na"}:
            raise HTTPException(status_code=400, detail="Salary range is mandatory and cannot be vague")

    if "responsibilities" in update_data and update_data["responsibilities"]:
        if len(update_data["responsibilities"].strip()) < 30:
            raise HTTPException(status_code=400, detail="Detailed role responsibilities are required")

    if "application_deadline" in update_data and update_data["application_deadline"] and job.posted_expires_at:
        if _to_utc_naive(update_data["application_deadline"]) > _to_utc_naive(job.posted_expires_at):
            raise HTTPException(status_code=400, detail="Application deadline must be within job expiry window")

    was_live = bool(job.is_active)
    for field, value in update_data.items():
        setattr(job, field, value)

    will_be_live = bool(update_data.get("is_active", job.is_active))

    db.commit()
    db.refresh(job)

    # Send alerts when a previously non-live job becomes live.
    if not was_live and will_be_live:
        background_tasks.add_task(_dispatch_alerts_for_job, job.id)

    applications = db.query(Application).filter(Application.job_id == job.id).all()
    return _build_job_response(job, current_user=current_user, applications=applications, db=db)


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user.role == "recruiter" and job.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete jobs posted by other recruiters")

    active_apps = db.query(Application).filter(Application.job_id == job_id, Application.status.in_(["applied", "shortlisted", "interview"])) .count()
    if active_apps > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete job with {active_apps} active application(s)")

    db.delete(job)
    db.commit()

    return {"message": "Job deleted"}