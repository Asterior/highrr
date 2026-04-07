from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float, Text, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class CandidateProfile(Base):
    """Main candidate profile with basic information"""
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Personal Information
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    
    # Location
    current_location = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    
    # Professional Summary
    headline = Column(String, nullable=True)  # e.g., "Senior Full Stack Developer"
    bio = Column(Text, nullable=True)  # Professional summary/about section
    
    # Career Information
    current_role = Column(String, nullable=True)
    current_company = Column(String, nullable=True)
    total_experience_years = Column(Float, default=0)
    notice_period_days = Column(Integer, nullable=True)
    
    # Salary Expectations
    current_salary = Column(Float, nullable=True)
    expected_salary = Column(Float, nullable=True)
    currency = Column(String, default="INR")
    
    # Education Summary
    highest_qualification = Column(String, nullable=True)
    cgpa = Column(Float, nullable=True)
    
    # Media
    avatar_url = Column(String, nullable=True)
    resume_url = Column(String, nullable=True)  # Current/primary resume
    
    # Job Preferences
    preferred_locations = Column(JSON, default=list)  # ["Bangalore", "Remote"]
    preferred_job_types = Column(JSON, default=list)  # ["full-time", "contract"]
    willing_to_relocate = Column(Boolean, default=False)
    open_to_remote = Column(Boolean, default=True)
    
    # Status
    is_active_job_seeker = Column(Boolean, default=True)
    availability = Column(String, default="immediate")  # immediate, 15days, 30days, 60days
    
    # Profile Completeness
    profile_completion_percentage = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    work_experiences = relationship("WorkExperience", back_populates="profile", cascade="all, delete-orphan")
    educations = relationship("Education", back_populates="profile", cascade="all, delete-orphan")
    skills = relationship("CandidateSkill", back_populates="profile", cascade="all, delete-orphan")
    certifications = relationship("Certification", back_populates="profile", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="profile", cascade="all, delete-orphan")
    social_links = relationship("SocialLink", back_populates="profile", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="profile", cascade="all, delete-orphan")
    languages = relationship("CandidateLanguage", back_populates="profile", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="candidate_profile", cascade="all, delete-orphan")


class WorkExperience(Base):
    """Work experience entries"""
    __tablename__ = "work_experiences"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    
    company_name = Column(String, nullable=False)
    job_title = Column(String, nullable=False)
    employment_type = Column(String, nullable=True)  # full-time, part-time, contract, internship
    
    location = Column(String, nullable=True)
    is_remote = Column(Boolean, default=False)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=False)
    
    description = Column(Text, nullable=True)
    responsibilities = Column(JSON, default=list)  # List of key responsibilities
    achievements = Column(JSON, default=list)  # List of achievements
    
    skills_used = Column(JSON, default=list)  # Technologies/skills used
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("CandidateProfile", back_populates="work_experiences")


class Education(Base):
    """Education history"""
    __tablename__ = "educations"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    
    institution_name = Column(String, nullable=False)
    degree = Column(String, nullable=False)  # B.Tech, M.Tech, MBA, etc.
    field_of_study = Column(String, nullable=True)  # Computer Science, Mechanical, etc.
    
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=False)
    
    grade = Column(String, nullable=True)  # CGPA, Percentage, Grade
    grade_type = Column(String, nullable=True)  # cgpa, percentage, grade
    
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("CandidateProfile", back_populates="educations")


class CandidateSkill(Base):
    """Skills with proficiency levels"""
    __tablename__ = "candidate_skills"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    
    skill_name = Column(String, nullable=False)
    category = Column(String, nullable=True)  # technical, soft, language, tool
    proficiency_level = Column(String, nullable=True)  # beginner, intermediate, advanced, expert
    years_of_experience = Column(Float, nullable=True)
    
    is_primary = Column(Boolean, default=False)  # Primary/core skill
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("CandidateProfile", back_populates="skills")


class Certification(Base):
    """Certifications and courses"""
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    
    name = Column(String, nullable=False)
    issuing_organization = Column(String, nullable=False)
    
    issue_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    does_not_expire = Column(Boolean, default=True)
    
    credential_id = Column(String, nullable=True)
    credential_url = Column(String, nullable=True)
    certificate_file_url = Column(String, nullable=True)  # Uploaded certificate
    
    description = Column(Text, nullable=True)
    skills_acquired = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("CandidateProfile", back_populates="certifications")


class Project(Base):
    """Portfolio projects"""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    
    role = Column(String, nullable=True)  # Developer, Lead, Team Member
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_ongoing = Column(Boolean, default=False)
    
    project_url = Column(String, nullable=True)  # Live demo
    github_url = Column(String, nullable=True)
    
    technologies_used = Column(JSON, default=list)
    key_features = Column(JSON, default=list)
    
    team_size = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("CandidateProfile", back_populates="projects")


class SocialLink(Base):
    """Social media and professional links"""
    __tablename__ = "social_links"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    
    platform = Column(String, nullable=False)  # linkedin, github, portfolio, twitter, etc.
    url = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    
    is_verified = Column(Boolean, default=False)
    is_public = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("CandidateProfile", back_populates="social_links")


class Resume(Base):
    """Multiple resume versions with ATS scores"""
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    
    title = Column(String, nullable=False)  # "Software Engineer Resume", "Data Analyst Resume"
    file_url = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)  # in bytes
    
    # ATS Information
    ats_score = Column(Float, nullable=True)  # 0-100
    ats_feedback = Column(JSON, default=dict)  # Detailed ATS analysis
    parsed_data = Column(JSON, default=dict)  # Extracted information from resume
    
    # Resume metadata
    is_primary = Column(Boolean, default=False)
    is_ats_optimized = Column(Boolean, default=False)
    
    # Version control
    version = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("CandidateProfile", back_populates="resumes")


class CandidateLanguage(Base):
    """Languages known by candidate"""
    __tablename__ = "candidate_languages"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    
    language = Column(String, nullable=False)
    proficiency = Column(String, nullable=False)  # native, fluent, conversational, basic
    
    can_read = Column(Boolean, default=True)
    can_write = Column(Boolean, default=True)
    can_speak = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    profile = relationship("CandidateProfile", back_populates="languages")