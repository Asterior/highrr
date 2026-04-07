from pydantic import BaseModel, EmailStr, HttpUrl, Field
from typing import Optional, List
from datetime import date, datetime


# ============= Candidate Profile Schemas =============

class CandidateProfileBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    
    current_location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    
    headline: Optional[str] = None
    bio: Optional[str] = None
    
    current_role: Optional[str] = None
    current_company: Optional[str] = None
    total_experience_years: float = 0
    notice_period_days: Optional[int] = None
    
    current_salary: Optional[float] = None
    expected_salary: Optional[float] = None
    currency: str = "INR"
    
    highest_qualification: Optional[str] = None
    cgpa: Optional[float] = None
    
    avatar_url: Optional[str] = None
    resume_url: Optional[str] = None
    
    preferred_locations: List[str] = []
    preferred_job_types: List[str] = []
    willing_to_relocate: bool = False
    open_to_remote: bool = True
    
    is_active_job_seeker: bool = True
    availability: str = "immediate"


class CandidateProfileCreate(CandidateProfileBase):
    user_id: int


class CandidateProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    
    current_location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    
    headline: Optional[str] = None
    bio: Optional[str] = None
    
    current_role: Optional[str] = None
    current_company: Optional[str] = None
    total_experience_years: Optional[float] = None
    notice_period_days: Optional[int] = None
    
    current_salary: Optional[float] = None
    expected_salary: Optional[float] = None
    currency: Optional[str] = None
    
    highest_qualification: Optional[str] = None
    cgpa: Optional[float] = None
    
    avatar_url: Optional[str] = None
    resume_url: Optional[str] = None
    
    preferred_locations: Optional[List[str]] = None
    preferred_job_types: Optional[List[str]] = None
    willing_to_relocate: Optional[bool] = None
    open_to_remote: Optional[bool] = None
    
    is_active_job_seeker: Optional[bool] = None
    availability: Optional[str] = None


class CandidateProfileResponse(CandidateProfileBase):
    id: int
    user_id: int
    profile_completion_percentage: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Work Experience Schemas =============

class WorkExperienceBase(BaseModel):
    company_name: str
    job_title: str
    employment_type: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool = False
    start_date: date
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None
    responsibilities: List[str] = []
    achievements: List[str] = []
    skills_used: List[str] = []


class WorkExperienceCreate(WorkExperienceBase):
    profile_id: int


class WorkExperienceUpdate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: Optional[str] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    achievements: Optional[List[str]] = None
    skills_used: Optional[List[str]] = None


class WorkExperienceResponse(WorkExperienceBase):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Education Schemas =============

class EducationBase(BaseModel):
    institution_name: str
    degree: str
    field_of_study: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    grade: Optional[str] = None
    grade_type: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None


class EducationCreate(EducationBase):
    profile_id: int


class EducationUpdate(BaseModel):
    institution_name: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    grade: Optional[str] = None
    grade_type: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None


class EducationResponse(EducationBase):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Skill Schemas =============

class CandidateSkillBase(BaseModel):
    skill_name: str
    category: Optional[str] = None
    proficiency_level: Optional[str] = None
    years_of_experience: Optional[float] = None
    is_primary: bool = False


class CandidateSkillCreate(CandidateSkillBase):
    profile_id: int


class CandidateSkillUpdate(BaseModel):
    skill_name: Optional[str] = None
    category: Optional[str] = None
    proficiency_level: Optional[str] = None
    years_of_experience: Optional[float] = None
    is_primary: Optional[bool] = None


class CandidateSkillResponse(CandidateSkillBase):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Certification Schemas =============

class CertificationBase(BaseModel):
    name: str
    issuing_organization: str
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    does_not_expire: bool = True
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    certificate_file_url: Optional[str] = None
    description: Optional[str] = None
    skills_acquired: List[str] = []


class CertificationCreate(CertificationBase):
    profile_id: int


class CertificationUpdate(BaseModel):
    name: Optional[str] = None
    issuing_organization: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    does_not_expire: Optional[bool] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    certificate_file_url: Optional[str] = None
    description: Optional[str] = None
    skills_acquired: Optional[List[str]] = None


class CertificationResponse(CertificationBase):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Project Schemas =============

class ProjectBase(BaseModel):
    title: str
    description: str
    role: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_ongoing: bool = False
    project_url: Optional[str] = None
    github_url: Optional[str] = None
    technologies_used: List[str] = []
    key_features: List[str] = []
    team_size: Optional[int] = None


class ProjectCreate(ProjectBase):
    profile_id: int


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_ongoing: Optional[bool] = None
    project_url: Optional[str] = None
    github_url: Optional[str] = None
    technologies_used: Optional[List[str]] = None
    key_features: Optional[List[str]] = None
    team_size: Optional[int] = None


class ProjectResponse(ProjectBase):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Social Link Schemas =============

class SocialLinkBase(BaseModel):
    platform: str
    url: str
    display_name: Optional[str] = None
    is_verified: bool = False
    is_public: bool = True


class SocialLinkCreate(SocialLinkBase):
    profile_id: int


class SocialLinkUpdate(BaseModel):
    platform: Optional[str] = None
    url: Optional[str] = None
    display_name: Optional[str] = None
    is_verified: Optional[bool] = None
    is_public: Optional[bool] = None


class SocialLinkResponse(SocialLinkBase):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Resume Schemas =============

class ResumeBase(BaseModel):
    title: str
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    ats_score: Optional[float] = None
    ats_feedback: dict = {}
    parsed_data: dict = {}
    is_primary: bool = False
    is_ats_optimized: bool = False
    version: int = 1


class ResumeCreate(ResumeBase):
    profile_id: int


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    ats_score: Optional[float] = None
    ats_feedback: Optional[dict] = None
    parsed_data: Optional[dict] = None
    is_primary: Optional[bool] = None
    is_ats_optimized: Optional[bool] = None


class ResumeResponse(ResumeBase):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Language Schemas =============

class CandidateLanguageBase(BaseModel):
    language: str
    proficiency: str
    can_read: bool = True
    can_write: bool = True
    can_speak: bool = True


class CandidateLanguageCreate(CandidateLanguageBase):
    profile_id: int


class CandidateLanguageUpdate(BaseModel):
    language: Optional[str] = None
    proficiency: Optional[str] = None
    can_read: Optional[bool] = None
    can_write: Optional[bool] = None
    can_speak: Optional[bool] = None


class CandidateLanguageResponse(CandidateLanguageBase):
    id: int
    profile_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============= Complete Profile Response (with nested data) =============

class CompleteProfileResponse(CandidateProfileResponse):
    work_experiences: List[WorkExperienceResponse] = []
    educations: List[EducationResponse] = []
    skills: List[CandidateSkillResponse] = []
    certifications: List[CertificationResponse] = []
    projects: List[ProjectResponse] = []
    social_links: List[SocialLinkResponse] = []
    resumes: List[ResumeResponse] = []
    languages: List[CandidateLanguageResponse] = []

    class Config:
        from_attributes = True