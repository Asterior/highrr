"""Router for job alert and notification endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import re

from app.api.deps import get_current_user
from app.core.constants import NOTIFICATION_PAGE_SIZE, MAX_ALERTS_PER_USER
from app.core.errors import bad_request, forbidden, not_found
from app.db.deps import get_db
from app.models.job_alert import JobAlert
from app.models.job import Job
from app.models.notification import Notification
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertOptionsResponse, AlertResponse, NotificationListResponse

alerts_router = APIRouter(prefix="/alerts")
notifications_router = APIRouter()


def _extract_salary_max_values(jobs: list[Job]) -> list[int]:
    values: set[int] = set()
    for job in jobs:
        if not job.salary:
            continue
        matches = re.findall(r"\d+(?:\.\d+)?", job.salary)
        if not matches:
            continue
        max_value = int(max(float(item) for item in matches))
        values.add(max_value)
    return sorted(values)


def _extract_experience_values(jobs: list[Job]) -> list[int]:
    values: set[int] = set()
    for job in jobs:
        if not job.experience_required:
            continue
        match = re.search(r"(\d+(?:\.\d+)?)", job.experience_required)
        if not match:
            continue
        values.add(int(float(match.group(1))))
    return sorted(values)


def _extract_role_keywords(jobs: list[Job]) -> list[str]:
    values: set[str] = set()
    for job in jobs:
        for skill in (job.required_skills or []):
            normalized = str(skill).strip()
            if normalized:
                values.add(normalized)
    return sorted(values, key=str.lower)


def _ensure_candidate(current_user: User) -> None:
    """Ensures the current user has the candidate role."""
    if current_user.role != "candidate":
        forbidden("Candidate role required")


@alerts_router.post("", response_model=AlertResponse, status_code=201)
def create_alert(payload: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Creates a new active job alert for the current candidate."""
    _ensure_candidate(current_user)

    active_count = db.query(JobAlert).filter(JobAlert.candidate_id == current_user.id, JobAlert.is_active == True).count()  # noqa: E712
    if active_count >= MAX_ALERTS_PER_USER:
        bad_request(f"Maximum {MAX_ALERTS_PER_USER} alerts allowed")

    alert = JobAlert(
        candidate_id=current_user.id,
        role_keywords=[keyword.strip() for keyword in payload.role_keywords if keyword.strip()],
        location=payload.location.strip() if payload.location else None,
        min_salary=payload.min_salary,
        max_experience=payload.max_experience,
        is_active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@alerts_router.get("/options", response_model=AlertOptionsResponse)
def get_alert_options(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns database-driven options for alert dropdown fields."""
    _ensure_candidate(current_user)

    jobs = db.query(Job).order_by(Job.created_at.desc()).limit(1000).all()

    locations = sorted(
        {
            job.location.strip()
            for job in jobs
            if isinstance(job.location, str) and job.location.strip()
        },
        key=str.lower,
    )

    return AlertOptionsResponse(
        role_keywords=_extract_role_keywords(jobs),
        locations=locations,
        min_salary_options=_extract_salary_max_values(jobs),
        max_experience_options=_extract_experience_values(jobs),
    )


@alerts_router.get("", response_model=list[AlertResponse])
def list_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns all active alerts for the current candidate."""
    _ensure_candidate(current_user)
    return (
        db.query(JobAlert)
        .filter(JobAlert.candidate_id == current_user.id, JobAlert.is_active == True)  # noqa: E712
        .order_by(JobAlert.created_at.desc())
        .all()
    )


@alerts_router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Soft deletes an alert owned by the current candidate."""
    _ensure_candidate(current_user)
    alert = db.query(JobAlert).filter(JobAlert.id == alert_id).first()
    if not alert:
        not_found("Alert")
    if alert.candidate_id != current_user.id:
        forbidden()

    alert.is_active = False
    db.commit()
    return {"message": "Alert deleted"}


@notifications_router.get("/notifications", response_model=NotificationListResponse)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(NOTIFICATION_PAGE_SIZE, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns paginated notifications ordered by unread first then newest."""
    _ensure_candidate(current_user)
    offset = (page - 1) * page_size
    base_query = db.query(Notification).filter(Notification.user_id == current_user.id)
    total_count = base_query.count()
    unread_count = base_query.filter(Notification.is_read == False).count()  # noqa: E712
    items = (
        base_query.order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return NotificationListResponse(items=items, total_count=total_count, unread_count=unread_count)


@notifications_router.patch("/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Marks all unread notifications as read for the current candidate."""
    _ensure_candidate(current_user)
    unread = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .all()
    )
    count = 0
    for notification in unread:
        notification.is_read = True
        count += 1
    db.commit()
    return {"marked_read": count}
