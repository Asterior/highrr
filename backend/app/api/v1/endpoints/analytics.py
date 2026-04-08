from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ats_engine import build_candidate_ats_snapshot
from app.db.deps import get_db
from app.models.application import Application
from app.models.interview import Interview
from app.models.job import Job
from app.models.user import User

router = APIRouter()


def ensure_admin(current_user):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/overview")
def overview(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ensure_admin(current_user)

    return {
        "total_jobs": db.query(Job).count(),
        "total_applications": db.query(Application).count(),
        "total_interviews": db.query(Interview).count(),
        "total_candidates": db.query(User).filter(User.role == "candidate").count(),
    }


@router.get("/pipeline")
def pipeline_counts(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ensure_admin(current_user)

    rows = (
        db.query(Application.status, func.count(Application.id))
        .group_by(Application.status)
        .all()
    )

    result = {
        "applied": 0,
        "shortlisted": 0,
        "interview": 0,
        "selected": 0,
        "rejected": 0,
    }

    for status, count in rows:
        if status in result:
            result[status] = count

    return result


@router.get("/jobs")
def applications_per_job(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ensure_admin(current_user)

    rows = (
        db.query(Job.id, Job.title, func.count(Application.id).label("applications"))
        .outerjoin(Application, Application.job_id == Job.id)
        .group_by(Job.id, Job.title)
        .all()
    )

    return [
        {
            "job_id": row.id,
            "job_title": row.title,
            "applications": row.applications,
        }
        for row in rows
    ]


@router.get("/trend")
def applications_trend(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ensure_admin(current_user)

    start_date = datetime.utcnow() - timedelta(days=30)
    rows = (
        db.query(func.date(Application.applied_at).label("date"), func.count(Application.id))
        .filter(Application.applied_at >= start_date)
        .group_by(func.date(Application.applied_at))
        .order_by(func.date(Application.applied_at).asc())
        .all()
    )

    return [
        {
            "date": str(row.date),
            "applications": row[1],
        }
        for row in rows
    ]


@router.get("/ats-score")
def candidate_ats_score(
    job_id: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Candidate access required")

    try:
        return build_candidate_ats_snapshot(db, current_user.id, job_id=job_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
