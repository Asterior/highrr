from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.application import Application
from app.models.interview import Interview
from app.models.job import Job
from app.models.user import User
from app.schemas.interview import (
    InterviewCandidateResponse,
    InterviewCreate,
    InterviewFeedbackUpdate,
    InterviewResponse,
    InterviewUpdate,
)

router = APIRouter()


@router.get("/", response_model=list[InterviewResponse])
def get_interviews(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(Interview).all()


@router.post("/", response_model=InterviewResponse)
def schedule_interview(
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    application = db.query(Application).filter(Application.id == payload.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    interviewer = db.query(User).filter(User.id == payload.interviewer_id).first()
    if not interviewer:
        raise HTTPException(status_code=404, detail="Interviewer not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    interview = Interview(
        application_id=payload.application_id,
        candidate_name=application.candidate_name,
        job_title=job.title,
        interviewer_id=payload.interviewer_id,
        interviewer_name=interviewer.name,
        scheduled_at=payload.scheduled_at,
        status="scheduled",
        interview_type=payload.interview_type,
        mode=payload.mode,
        timezone=payload.timezone,
        notes=payload.notes,
        meeting_link=payload.meeting_link,
        location=payload.location,
        candidate_response_status="pending",
        candidate_preferred_slots=[],
        status_history=[{"status": "scheduled", "date": payload.scheduled_at.isoformat()}],
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


@router.get("/me", response_model=list[InterviewResponse])
def get_my_interviews(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == "candidate":
        # Candidates see interviews for their applications
        return (
            db.query(Interview)
            .join(Application, Interview.application_id == Application.id)
            .filter(Application.user_id == current_user.id)
            .all()
        )
    elif current_user.role == "recruiter":
        # Recruiters see interviews for applicants to their jobs
        recruiter_job_ids = select(Job.id).where(Job.created_by == current_user.id)
        return (
            db.query(Interview)
            .join(Application, Interview.application_id == Application.id)
            .filter(Application.job_id.in_(recruiter_job_ids))
            .all()
        )
    elif current_user.role == "admin":
        # Admins see all interviews
        return db.query(Interview).all()
    else:
        raise HTTPException(status_code=403, detail="Not authorized")


@router.post("/{interview_id}/candidate-response", response_model=InterviewResponse)
def respond_to_interview(
    interview_id: int,
    payload: InterviewCandidateResponse,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    application = db.query(Application).filter(Application.id == interview.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == "candidate" and application.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if payload.action == "confirm":
        interview.candidate_response_status = "confirmed"
        interview.candidate_response_reason = None
    elif payload.action == "reschedule":
        interview.candidate_response_status = "reschedule_requested"
        interview.candidate_response_reason = payload.reason
        interview.candidate_preferred_slots = payload.preferred_slots
        interview.status = "rescheduled"
    elif payload.action == "cancel":
        interview.candidate_response_status = "cancelled"
        interview.candidate_response_reason = payload.reason
        interview.status = "cancelled"
    else:
        raise HTTPException(status_code=400, detail="Invalid candidate action")

    if payload.preferred_timezone:
        interview.timezone = payload.preferred_timezone

    history = interview.status_history or []
    history.append({"status": interview.status, "date": datetime.utcnow().isoformat()})
    interview.status_history = history

    db.commit()
    db.refresh(interview)
    return interview


@router.post("/{interview_id}/feedback", response_model=InterviewResponse)
def capture_interview_feedback(
    interview_id: int,
    payload: InterviewFeedbackUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    decision_already_set = bool(interview.recruiter_decision)

    if not decision_already_set and (
        payload.rating is None or payload.notes is None or payload.decision is None
    ):
        raise HTTPException(
            status_code=400,
            detail="rating, notes, and decision are required before completing an interview",
        )

    if decision_already_set and payload.decision and payload.decision != interview.recruiter_decision:
        raise HTTPException(
            status_code=400,
            detail="Decision is locked once set. You can edit only rating/notes.",
        )

    if payload.rating is not None:
        interview.feedback_rating = payload.rating
    if payload.notes is not None:
        interview.feedback_notes = payload.notes
    if payload.decision is not None and not decision_already_set:
        interview.recruiter_decision = payload.decision

    effective_decision = interview.recruiter_decision

    if effective_decision in {"hire", "reject", "hold"}:
        interview.status = "completed"

    app = db.query(Application).filter(Application.id == interview.application_id).first()
    if app:
        if effective_decision == "hire":
            app.status = "selected"
        elif effective_decision == "reject":
            app.status = "rejected"
        elif effective_decision == "hold":
            app.status = "interview"

        app_history = app.status_history or []
        app_history.append({"status": app.status, "date": datetime.utcnow().isoformat()})
        app.status_history = app_history

    history = interview.status_history or []
    history.append({"status": interview.status, "date": datetime.utcnow().isoformat()})
    interview.status_history = history

    db.commit()
    db.refresh(interview)
    return interview


@router.put("/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: int,
    payload: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    update_data = payload.model_dump(exclude_unset=True)

    if update_data.get("status") == "completed":
        raise HTTPException(
            status_code=400,
            detail="Use feedback endpoint to complete interview with required rating, notes, and decision",
        )

    if "interviewer_id" in update_data:
        interviewer = db.query(User).filter(User.id == update_data["interviewer_id"]).first()
        if not interviewer:
            raise HTTPException(status_code=404, detail="Interviewer not found")
        interview.interviewer_name = interviewer.name

    if "status" in update_data and update_data["status"] != interview.status:
        history = interview.status_history or []
        history.append({"status": update_data["status"], "date": datetime.utcnow().isoformat()})
        interview.status_history = history

    for field, value in update_data.items():
        setattr(interview, field, value)

    db.commit()
    db.refresh(interview)
    return interview


@router.delete("/{interview_id}")
def delete_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    db.delete(interview)
    db.commit()
    return {"message": "Interview deleted"}
