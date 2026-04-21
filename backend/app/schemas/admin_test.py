from datetime import datetime

from pydantic import BaseModel, Field


class AdminTestQuestion(BaseModel):
    id: str
    question: str
    expected_keywords: list[str] = Field(default_factory=list)
    max_points: float = 10.0


class AdminTestCreate(BaseModel):
    title: str
    description: str | None = None
    due_at: datetime | None = None
    questions: list[AdminTestQuestion]


class AdminTestResponse(BaseModel):
    id: int
    title: str
    description: str | None
    due_at: datetime | None
    is_active: bool
    created_by: int
    created_at: datetime
    questions: list[AdminTestQuestion]

    class Config:
        from_attributes = True


class AdminTestSubmissionCreate(BaseModel):
    answers: dict[str, str]


class AdminTestSubmissionResponse(BaseModel):
    id: int
    test_id: int
    candidate_id: int
    score: float
    remarks: dict
    submitted_at: datetime
    graded_at: datetime

    class Config:
        from_attributes = True


class CandidateTestItem(BaseModel):
    id: int
    title: str
    description: str | None
    due_at: datetime | None
    created_at: datetime
    questions: list[AdminTestQuestion]
    already_submitted: bool
    last_score: float | None = None
