import os
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import OllamaResponseError, OllamaTimeoutError, OllamaUnavailableError
from app.core.ollama_client import OllamaClient
from app.db.deps import get_db
from app.models.application import Application
from app.models.interview import Interview
from app.models.job import Job

router = APIRouter(prefix="/assistant", tags=["Assistant"])


class AssistantHistoryMessage(BaseModel):
    role: str
    text: str


class AssistantQuery(BaseModel):
    message: str
    history: list[AssistantHistoryMessage] = Field(default_factory=list)


def _jobs_scope(db: Session, current_user):
    query = db.query(Job)
    if current_user.role == "recruiter":
        query = query.filter(Job.created_by == current_user.id)
    return query


def _apps_scope(db: Session, current_user):
    query = db.query(Application)
    if current_user.role == "recruiter":
        recruiter_job_ids = db.query(Job.id).filter(Job.created_by == current_user.id).subquery()
        query = query.filter(Application.job_id.in_(recruiter_job_ids))
    if current_user.role == "candidate":
        query = query.filter(Application.user_id == current_user.id)
    return query


def _interviews_scope(db: Session, current_user):
    query = db.query(Interview)
    if current_user.role == "candidate":
        candidate_app_ids = db.query(Application.id).filter(Application.user_id == current_user.id).subquery()
        query = query.filter(Interview.application_id.in_(candidate_app_ids))
    return query


def _backend_jobs_count(jobs: list[Job]) -> int:
    def _is_backend(job: Job) -> bool:
        text = " ".join(
            [
                str(job.title or ""),
                str(job.description or ""),
                str(getattr(job, "department", "") or ""),
                str(getattr(job, "responsibilities", "") or ""),
            ]
        ).lower()
        return "backend" in text

    return sum(1 for job in jobs if _is_backend(job))


def _deterministic_reply(db: Session, current_user, text: str) -> str | None:
    lower = text.lower()

    jobs = _jobs_scope(db, current_user).all()
    apps_query = _apps_scope(db, current_user)
    interviews_query = _interviews_scope(db, current_user)

    jobs_count = len(jobs)
    apps_count = apps_query.count()
    interviews_count = interviews_query.count()
    selected_count = apps_query.filter(Application.status == "selected").count()

    if "backend job" in lower or "backend jobs" in lower:
        backend_jobs = _backend_jobs_count(jobs)
        return f"There are {backend_jobs} backend jobs in your current scope."

    if any(token in lower for token in ["stats", "how many", "number of", "count"]):
        if current_user.role == "candidate":
            shortlisted = apps_query.filter(Application.status == "shortlisted").count()
            return (
                f"Current stats: {jobs_count} visible jobs, {apps_count} applications, "
                f"{interviews_count} interviews, {selected_count} selected, {shortlisted} shortlisted."
            )
        return (
            f"Current stats: {jobs_count} jobs, {apps_count} applications, "
            f"{interviews_count} interviews, {selected_count} selected candidates."
        )

    faq_pairs = {
        "pipeline": "Hierarchy is one-way only: applied -> shortlisted -> interview -> selected, with rejected allowed from active stages and no backward moves.",
        "hierarchy": "Hierarchy is one-way only: applied -> shortlisted -> interview -> selected, with rejected allowed from active stages and no backward moves.",
        "message": "To initiate messaging: Recruiter can start from Candidates -> message icon, and candidates can start from company/job context or Messages using participant id.",
        "chat": "To initiate messaging: Recruiter can start from Candidates -> message icon, and candidates can start from company/job context or Messages using participant id.",
        "job create": "Go to Jobs -> Create Job. You can upload JD for autofill, then confirm responsibilities, timeline, and deadline.",
        "jd": "Go to Jobs -> Create Job and use Upload JD for Autofill. Review parsed skills, responsibilities, and experience before posting.",
        "ats": "Use Candidate -> ATS Score. Upload/choose a resume, select target role, then run Live ATS Scan to get keyword gaps and improvement insights.",
        "resume": "Use Candidate -> ATS Score. Upload/choose a resume, select target role, then run Live ATS Scan to get keyword gaps and improvement insights.",
        "test": "Admins can create tests in Tests (Admin). Candidates can take them in Candidate -> Tests, and scoring with feedback is generated on submission.",
        "verification": "Recruiter verification details are persisted and remain visible while locked across login/restart.",
    }
    for key, value in faq_pairs.items():
        if key in lower:
            return value

    return None


def _normalize_history(history: list[AssistantHistoryMessage]) -> list[dict[str, str]]:
    max_items = max(0, int(os.getenv("ASSISTANT_HISTORY_MAX_ITEMS", "40")))
    normalized: list[dict[str, str]] = []
    allowed_roles = {"user", "assistant"}

    for item in history[-max_items:]:
        role = (item.role or "").strip().lower()
        text = (item.text or "").strip()
        if role in allowed_roles and text:
            normalized.append({"role": role, "content": text})

    return normalized


def _serialize_scope_context(db: Session, current_user) -> str:
    jobs = _jobs_scope(db, current_user).all()
    apps_query = _apps_scope(db, current_user)
    interviews_query = _interviews_scope(db, current_user)

    app_status_rows = (
        apps_query.with_entities(Application.status, func.count(Application.id))
        .group_by(Application.status)
        .all()
    )
    interview_status_rows = (
        interviews_query.with_entities(Interview.status, func.count(Interview.id))
        .group_by(Interview.status)
        .all()
    )

    job_lines: list[str] = []
    for job in jobs:
        skills = job.required_skills if isinstance(job.required_skills, list) else []
        skills_text = ", ".join(str(skill) for skill in skills if skill) or "n/a"
        job_lines.append(
            f"job_id={job.id} | title={job.title or 'n/a'} | status={job.status or 'n/a'} | "
            f"active={bool(job.is_active)} | location={job.location or 'n/a'} | "
            f"type={job.job_type or 'n/a'} | exp={job.experience_required or 'n/a'} | "
            f"salary={job.salary or 'n/a'} | skills={skills_text}"
        )

    app_status_text = ", ".join(f"{status or 'unknown'}={count}" for status, count in app_status_rows) or "none"
    interview_status_text = ", ".join(f"{status or 'unknown'}={count}" for status, count in interview_status_rows) or "none"

    context = (
        "Scoped platform context for accurate answering:\n"
        f"- user_role: {current_user.role}\n"
        f"- scoped_jobs_count: {len(jobs)}\n"
        f"- scoped_applications_count: {apps_query.count()}\n"
        f"- scoped_interviews_count: {interviews_query.count()}\n"
        f"- application_status_breakdown: {app_status_text}\n"
        f"- interview_status_breakdown: {interview_status_text}\n"
        "- hierarchy_rule: applied -> shortlisted -> interview -> selected (no backward movement).\n"
        "- scoped_jobs:\n"
        + ("\n".join(job_lines) if job_lines else "none")
    )

    max_chars = max(2000, int(os.getenv("ASSISTANT_CONTEXT_MAX_CHARS", "32000")))
    return context[:max_chars]


def _clean_reply(text: str) -> str:
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.IGNORECASE | re.DOTALL).strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned


def _qwen_reply(question: str, history: list[AssistantHistoryMessage], scope_context: str) -> str | None:
    system_instruction = (
        "You are Highrr assistant for hiring workflows. "
        "Use ONLY provided context and user conversation. "
        "Be concise, accurate, and action-oriented. "
        "If data is unavailable, say exactly what is unavailable. "
        "Never invent counts, statuses, users, or jobs. "
        "Answer with actionable product steps and exact page names when relevant."
    )

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "system", "content": scope_context},
        *_normalize_history(history),
        {"role": "user", "content": question},
    ]

    try:
        client = OllamaClient()
        raw = client.chat(messages=messages)
        cleaned = _clean_reply(raw)
        return cleaned or None
    except (OllamaUnavailableError, OllamaTimeoutError, OllamaResponseError, RuntimeError):
        return None


@router.post("/chat")
def assistant_chat(
    payload: AssistantQuery,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    text = (payload.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    deterministic = _deterministic_reply(db, current_user, text)
    if deterministic:
        return {"reply": deterministic}

    scope_context = _serialize_scope_context(db, current_user)

    generated = _qwen_reply(text, payload.history, scope_context)
    if generated:
        return {"reply": generated, "provider": "ollama"}

    apps_count = _apps_scope(db, current_user).count()
    interviews_count = _interviews_scope(db, current_user).count()
    jobs_count = _jobs_scope(db, current_user).count()
    fallback = (
        "AI service is temporarily unavailable, but here is your current scoped summary: "
        f"jobs={jobs_count}, applications={apps_count}, interviews={interviews_count}. "
        "You can still ask specific stats like 'backend jobs count' or 'pipeline rules' and I will answer from live system data."
    )
    return {"reply": fallback, "provider": "fallback"}
