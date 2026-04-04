from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.application import Application
from app.models.interview import Interview
from app.models.job import Job
from app.models.user import User
from app.schemas.interview import InterviewCreate, InterviewResponse, InterviewUpdate

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
        notes=payload.notes,
        meeting_link=payload.meeting_link,
        location=payload.location,
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


@router.get("/me", response_model=list[InterviewResponse])
def get_my_interviews(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can access this endpoint")

    return (
        db.query(Interview)
        .join(Application, Interview.application_id == Application.id)
        .filter(Application.user_id == current_user.id)
        .all()
    )


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

    if "interviewer_id" in update_data:
        interviewer = db.query(User).filter(User.id == update_data["interviewer_id"]).first()
        if not interviewer:
            raise HTTPException(status_code=404, detail="Interviewer not found")
        interview.interviewer_name = interviewer.name

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
