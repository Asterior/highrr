import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import OllamaResponseError, OllamaTimeoutError, OllamaUnavailableError
from app.core.ollama_client import OllamaClient
from app.db.deps import get_db
from app.models.admin_test import AdminTest, AdminTestSubmission
from app.models.user import User
from app.schemas.admin_test import (
    AdminTestCreate,
    AdminTestResponse,
    AdminTestSubmissionCreate,
    AdminTestSubmissionResponse,
    CandidateTestItem,
)

router = APIRouter(prefix="/tests", tags=["Tests"])


def _ensure_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def _grade_submission(test: AdminTest, answers: dict[str, str]) -> tuple[float, dict]:
    question_feedback: list[dict] = []
    total_score = 0.0
    total_possible = 0.0

    for raw_question in (test.questions or []):
        qid = str(raw_question.get("id", "")).strip()
        question = str(raw_question.get("question", "")).strip()
        expected_keywords = [str(k).lower().strip() for k in (raw_question.get("expected_keywords") or []) if str(k).strip()]
        max_points = float(raw_question.get("max_points", 10.0) or 10.0)

        candidate_answer = str(answers.get(qid, "") or "")
        lowered = candidate_answer.lower()
        matched = [k for k in expected_keywords if k and k in lowered]

        if expected_keywords:
            ratio = len(matched) / max(len(expected_keywords), 1)
            points = round(max_points * ratio, 2)
        else:
            points = round(min(max_points, max_points if candidate_answer.strip() else 0.0), 2)

        total_score += points
        total_possible += max_points

        missing = [k for k in expected_keywords if k not in matched]
        question_feedback.append(
            {
                "question_id": qid,
                "question": question,
                "points": points,
                "max_points": max_points,
                "matched_keywords": matched,
                "missing_keywords": missing[:8],
                "suggestion": "Add concrete examples and include missing keywords." if missing else "Good coverage for this question.",
            }
        )

    final_score = round((total_score / max(total_possible, 1.0)) * 100.0, 2)
    summary = {
        "overall": "excellent" if final_score >= 80 else "good" if final_score >= 60 else "needs_improvement",
        "feedback": question_feedback,
        "recommendations": [
            "Use concise STAR-format answers for behavioral prompts.",
            "Include project outcomes with numbers where possible.",
            "Cover role-specific keywords mentioned in job descriptions.",
        ],
    }
    return final_score, summary


def _build_llm_prompt(title: str, score: float, remarks: dict) -> str:
    return (
        "You are an interview coach. Return ONLY valid JSON with keys strengths and improvements. "
        "Each key must be an array of short strings (max 4 items). "
        f"Test title: {title}. Score: {score}. "
        f"Rule-based feedback: {json.dumps(remarks)[:2000]}"
    )


def _optional_llm_remarks(title: str, score: float, remarks: dict) -> dict | None:
    try:
        client = OllamaClient()
        text = client.generate(_build_llm_prompt(title, score, remarks))
        return json.loads(text) if text else None
    except (OllamaUnavailableError, OllamaTimeoutError, OllamaResponseError, ValueError, json.JSONDecodeError, RuntimeError):
        return None


@router.post("/admin", response_model=AdminTestResponse)
def create_test(
    payload: AdminTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_admin(current_user)

    if not payload.questions:
        raise HTTPException(status_code=400, detail="At least one question is required")

    test = AdminTest(
        title=payload.title.strip(),
        description=(payload.description or "").strip() or None,
        due_at=payload.due_at,
        questions=[q.model_dump() for q in payload.questions],
        created_by=current_user.id,
        is_active=True,
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


@router.get("/admin", response_model=list[AdminTestResponse])
def list_admin_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_admin(current_user)
    return db.query(AdminTest).order_by(AdminTest.created_at.desc()).all()


@router.get("/candidate", response_model=list[CandidateTestItem])
def list_candidate_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Candidate access required")

    tests = db.query(AdminTest).filter(AdminTest.is_active == True).order_by(AdminTest.created_at.desc()).all()  # noqa: E712
    output: list[CandidateTestItem] = []
    for test in tests:
        sub = (
            db.query(AdminTestSubmission)
            .filter(AdminTestSubmission.test_id == test.id, AdminTestSubmission.candidate_id == current_user.id)
            .first()
        )
        output.append(
            CandidateTestItem(
                id=test.id,
                title=test.title,
                description=test.description,
                due_at=test.due_at,
                created_at=test.created_at,
                questions=test.questions or [],
                already_submitted=bool(sub),
                last_score=sub.score if sub else None,
            )
        )
    return output


@router.post("/candidate/{test_id}/submit", response_model=AdminTestSubmissionResponse)
def submit_candidate_test(
    test_id: int,
    payload: AdminTestSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Candidate access required")

    test = db.query(AdminTest).filter(AdminTest.id == test_id, AdminTest.is_active == True).first()  # noqa: E712
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    existing = (
        db.query(AdminTestSubmission)
        .filter(AdminTestSubmission.test_id == test_id, AdminTestSubmission.candidate_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already submitted this test")

    score, remarks = _grade_submission(test, payload.answers)
    llm = _optional_llm_remarks(test.title, score, remarks)
    if llm:
        remarks["ai"] = llm

    submission = AdminTestSubmission(
        test_id=test_id,
        candidate_id=current_user.id,
        answers=payload.answers,
        score=score,
        remarks=remarks,
        submitted_at=datetime.utcnow(),
        graded_at=datetime.utcnow(),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/admin/submissions", response_model=list[AdminTestSubmissionResponse])
def list_submissions_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_admin(current_user)
    return db.query(AdminTestSubmission).order_by(AdminTestSubmission.submitted_at.desc()).all()
