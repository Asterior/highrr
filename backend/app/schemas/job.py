from pydantic import BaseModel


class JobCreate(BaseModel):
    title: str
    description: str
    location: str
    salary: str
    job_type: str
    required_skills: str
    experience_required: str


class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    location: str
    salary: str
    job_type: str
    required_skills: str
    experience_required: str
    is_active: bool

    class Config:
        from_attributes = True