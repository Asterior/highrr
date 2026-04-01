from pydantic import BaseModel


class ApplicationCreate(BaseModel):
    job_id: int


class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    status: str
    score: int
    assigned_to: int | None
    notes: str | None
    is_active: bool

    class Config:
        from_attributes = True