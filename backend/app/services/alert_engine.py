"""Alert engine service.
Matches newly posted jobs against active candidate alerts.
Creates notification records for qualifying matches.
Triggered as a background task on job creation.
Also runs on a schedule every ALERT_ENGINE_INTERVAL_HOURS hours.
No HTTP concerns. No FastAPI imports.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.core.constants import ALERT_ENGINE_INTERVAL_HOURS, MATCH_SCORE_THRESHOLD
from app.models.application import Application
from app.models.company_verification import CompanyVerification
from app.models.job import Job
from app.models.job_alert import JobAlert
from app.models.notification import Notification
from app.models.user import User
from app.services.match_score import calculate_match_score

LOGGER = logging.getLogger(__name__)
_LAST_ALERT_SCAN_TIMESTAMP = datetime.utcnow() - timedelta(hours=ALERT_ENGINE_INTERVAL_HOURS)


def _normalize(value: str | None) -> str:
    """Returns normalized lowercase text for alert comparisons."""
    return (value or "").strip().lower()


def keywords_match(job_title: str, job_description: str, keywords: list[str]) -> bool:
    """Returns True when any alert keyword appears in the job text."""
    if not keywords:
        return False
    haystack = f"{job_title or ''} {job_description or ''}".lower()
    return any(_normalize(keyword) and _normalize(keyword) in haystack for keyword in keywords)


def _salary_max_value(job: Job) -> int | None:
    """Extracts the upper bound from a freeform salary string."""
    import re

    if not job.salary:
        return None
    numbers = [int(float(value)) for value in re.findall(r"\d+(?:\.\d+)?", job.salary)]
    if not numbers:
        return None
    return max(numbers)


def _job_min_experience(job: Job) -> int | None:
    """Extracts minimum experience years from the job string field."""
    import re

    if not job.experience_required:
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", job.experience_required)
    if not match:
        return None
    return int(float(match.group(1)))


def alert_matches_job(alert: JobAlert, job: Job) -> bool:
    """Checks whether a job satisfies all alert filters."""
    if alert.role_keywords and not keywords_match(job.title, job.description, alert.role_keywords):
        return False

    salary_max = _salary_max_value(job)
    if alert.min_salary is not None and (salary_max is None or salary_max < alert.min_salary):
        return False

    job_min_exp = _job_min_experience(job)
    if alert.max_experience is not None and (job_min_exp is None or job_min_exp > alert.max_experience):
        return False

    if alert.location:
        location_match = (
            getattr(job, "is_remote", False) is True
            or _normalize(alert.location) == _normalize(job.location)
        )
        if not location_match:
            return False

    return True


def build_notification_body(score: int, applicant_count: int, days_since_posted: int) -> str:
    """Builds the human-readable notification reason string."""
    days_text = "today" if days_since_posted == 0 else f"{days_since_posted} day(s) ago"
    return (
        f"This matches {score}% of your alert preferences. "
        f"{applicant_count} applicants so far. "
        f"Posted {days_text}. Apply today."
    )


def _company_name_for_job(db: Session, job: Job) -> str:
    """Returns a friendly company name for notification titles."""
    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == job.created_by).first()
    if company and company.company_name:
        return company.company_name

    recruiter = db.query(User).filter(User.id == job.created_by).first()
    return recruiter.name if recruiter and recruiter.name else "Employer"


def process_alerts_for_job(job_id: int, db: Session) -> int:
    """Processes a single job against all active alerts and creates notifications."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return 0

    notifications_created = 0
    active_alerts = db.query(JobAlert).filter(JobAlert.is_active == True).all()  # noqa: E712
    applicant_count = db.query(Application).filter(Application.job_id == job.id).count()
    days_since_posted = max(0, (datetime.utcnow() - (job.created_at or datetime.utcnow())).days)
    company_name = _company_name_for_job(db, job)

    for alert in active_alerts:
        if alert.last_triggered_at and alert.last_triggered_at >= (job.created_at or datetime.utcnow()):
            continue

        if not alert_matches_job(alert, job):
            continue

        candidate_payload: dict[str, Any] = {
            "city": None,
            "state": None,
            "current_location": alert.location,
            "total_experience_years": alert.max_experience or 0,
            "expected_salary": alert.min_salary,
            "skills": [{"skill_name": keyword} for keyword in (alert.role_keywords or [])],
        }
        job_payload: dict[str, Any] = {
            "required_skills": job.required_skills or [],
            "experience_required": job.experience_required,
            "location": job.location,
            "salary": job.salary,
        }

        try:
            score = calculate_match_score(candidate_payload, job_payload)
        except Exception as exc:  # pragma: no cover - defensive fallback
            LOGGER.warning("Alert scoring failed for job %s: %s", job.id, exc)
            score = {"total_score": 0}

        if int(score.get("total_score", 0)) < MATCH_SCORE_THRESHOLD:
            continue

        db.add(
            Notification(
                user_id=alert.candidate_id,
                type="job_alert",
                title=f"New job match: {job.title} at {company_name}",
                body=build_notification_body(int(score.get("total_score", 0)), applicant_count, days_since_posted),
                job_id=job.id,
                is_read=False,
            )
        )
        alert.last_triggered_at = datetime.utcnow()
        notifications_created += 1

    db.commit()
    return notifications_created


def run_scheduled_alert_scan(db: Session) -> int:
    """Runs the scheduled scan for jobs created since the previous scan."""
    global _LAST_ALERT_SCAN_TIMESTAMP

    window_start = _LAST_ALERT_SCAN_TIMESTAMP
    now = datetime.utcnow()
    jobs = (
        db.query(Job)
        .filter(Job.created_at >= window_start)
        .order_by(Job.created_at.asc())
        .all()
    )

    created_count = 0
    for job in jobs:
        created_count += process_alerts_for_job(job.id, db)

    _LAST_ALERT_SCAN_TIMESTAMP = now
    LOGGER.info("Alert engine scan completed. Notifications created: %s", created_count)
    return created_count
