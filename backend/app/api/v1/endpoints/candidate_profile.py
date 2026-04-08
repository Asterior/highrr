from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.candidate_profile import (
    CandidateProfile, WorkExperience, Education, CandidateSkill,
    Certification, Project, SocialLink, Resume, CandidateLanguage
)
from app.schemas.candidate_profile import (
    CandidateProfileCreate, CandidateProfileUpdate, CandidateProfileResponse,
    CompleteProfileResponse, WorkExperienceCreate, WorkExperienceUpdate,
    WorkExperienceResponse, EducationCreate, EducationUpdate, EducationResponse,
    CandidateSkillCreate, CandidateSkillUpdate, CandidateSkillResponse,
    CertificationCreate, CertificationUpdate, CertificationResponse,
    ProjectCreate, ProjectUpdate, ProjectResponse,
    SocialLinkCreate, SocialLinkUpdate, SocialLinkResponse,
    ResumeCreate, ResumeUpdate, ResumeResponse,
    CandidateLanguageCreate, CandidateLanguageUpdate, CandidateLanguageResponse
)

router = APIRouter(prefix="/profile", tags=["Candidate Profile"])


# ============= Profile CRUD =============

@router.post("/", response_model=CandidateProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    profile: CandidateProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new candidate profile"""
    # Check if profile already exists
    existing_profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == profile.user_id
    ).first()
    
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists for this user"
        )
    
    # Only candidates can create their own profile, or admin can create for anyone
    if current_user.role not in ["admin"] and current_user.id != profile.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create profile for this user"
        )
    
    db_profile = CandidateProfile(**profile.model_dump())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    
    return db_profile


@router.get("/me", response_model=CompleteProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's complete profile"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please create a profile first."
        )
    
    return profile


@router.get("/{profile_id}", response_model=CompleteProfileResponse)
def get_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get profile by ID (admin/recruiter can view any, candidates only their own)"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.id == profile_id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Authorization check
    if current_user.role == "candidate" and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this profile"
        )
    
    return profile


@router.get("/by-user/{user_id}", response_model=CompleteProfileResponse)
def get_profile_by_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a profile by user ID for recruiter/admin review flows"""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    if current_user.role == "candidate" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this profile")

    return profile


@router.put("/me", response_model=CandidateProfileResponse)
def update_my_profile(
    profile_update: CandidateProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Update fields
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    # Calculate profile completion
    profile.profile_completion_percentage = calculate_profile_completion(profile, db)
    
    db.commit()
    db.refresh(profile)
    
    return profile


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete current user's profile"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    db.delete(profile)
    db.commit()
    
    return None


# ============= Work Experience CRUD =============

@router.post("/work-experience", response_model=WorkExperienceResponse, status_code=status.HTTP_201_CREATED)
def add_work_experience(
    experience: WorkExperienceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add work experience to profile"""
    profile = verify_profile_ownership(experience.profile_id, current_user, db)
    
    db_experience = WorkExperience(**experience.model_dump())
    db.add(db_experience)
    db.commit()
    db.refresh(db_experience)
    
    # Update profile completion
    profile.profile_completion_percentage = calculate_profile_completion(profile, db)
    db.commit()
    
    return db_experience


@router.get("/work-experience", response_model=List[WorkExperienceResponse])
def get_work_experiences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all work experiences for current user"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile.work_experiences


@router.put("/work-experience/{experience_id}", response_model=WorkExperienceResponse)
def update_work_experience(
    experience_id: int,
    experience_update: WorkExperienceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update work experience"""
    experience = db.query(WorkExperience).filter(WorkExperience.id == experience_id).first()
    
    if not experience:
        raise HTTPException(status_code=404, detail="Work experience not found")
    
    verify_profile_ownership(experience.profile_id, current_user, db)
    
    update_data = experience_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(experience, field, value)
    
    db.commit()
    db.refresh(experience)
    
    return experience


@router.delete("/work-experience/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_experience(
    experience_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete work experience"""
    experience = db.query(WorkExperience).filter(WorkExperience.id == experience_id).first()
    
    if not experience:
        raise HTTPException(status_code=404, detail="Work experience not found")
    
    verify_profile_ownership(experience.profile_id, current_user, db)
    
    db.delete(experience)
    db.commit()
    
    return None


# ============= Education CRUD =============

@router.post("/education", response_model=EducationResponse, status_code=status.HTTP_201_CREATED)
def add_education(
    education: EducationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add education to profile"""
    profile = verify_profile_ownership(education.profile_id, current_user, db)
    
    db_education = Education(**education.model_dump())
    db.add(db_education)
    db.commit()
    db.refresh(db_education)
    
    # Update profile completion
    profile.profile_completion_percentage = calculate_profile_completion(profile, db)
    db.commit()
    
    return db_education


@router.get("/education", response_model=List[EducationResponse])
def get_educations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all education entries for current user"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile.educations


@router.put("/education/{education_id}", response_model=EducationResponse)
def update_education(
    education_id: int,
    education_update: EducationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update education entry"""
    education = db.query(Education).filter(Education.id == education_id).first()
    
    if not education:
        raise HTTPException(status_code=404, detail="Education not found")
    
    verify_profile_ownership(education.profile_id, current_user, db)
    
    update_data = education_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(education, field, value)
    
    db.commit()
    db.refresh(education)
    
    return education


@router.delete("/education/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    education_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete education entry"""
    education = db.query(Education).filter(Education.id == education_id).first()
    
    if not education:
        raise HTTPException(status_code=404, detail="Education not found")
    
    verify_profile_ownership(education.profile_id, current_user, db)
    
    db.delete(education)
    db.commit()
    
    return None


# ============= Skills CRUD =============

@router.post("/skills", response_model=CandidateSkillResponse, status_code=status.HTTP_201_CREATED)
def add_skill(
    skill: CandidateSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add skill to profile"""
    profile = verify_profile_ownership(skill.profile_id, current_user, db)
    
    db_skill = CandidateSkill(**skill.model_dump())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    
    # Update profile completion
    profile.profile_completion_percentage = calculate_profile_completion(profile, db)
    db.commit()
    
    return db_skill


@router.get("/skills", response_model=List[CandidateSkillResponse])
def get_skills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all skills for current user"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile.skills


@router.put("/skills/{skill_id}", response_model=CandidateSkillResponse)
def update_skill(
    skill_id: int,
    skill_update: CandidateSkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update skill"""
    skill = db.query(CandidateSkill).filter(CandidateSkill.id == skill_id).first()
    
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    verify_profile_ownership(skill.profile_id, current_user, db)
    
    update_data = skill_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(skill, field, value)
    
    db.commit()
    db.refresh(skill)
    
    return skill


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete skill"""
    skill = db.query(CandidateSkill).filter(CandidateSkill.id == skill_id).first()
    
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    verify_profile_ownership(skill.profile_id, current_user, db)
    
    db.delete(skill)
    db.commit()
    
    return None


# ============= Certifications CRUD =============

@router.post("/certifications", response_model=CertificationResponse, status_code=status.HTTP_201_CREATED)
def add_certification(
    certification: CertificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add certification to profile"""
    profile = verify_profile_ownership(certification.profile_id, current_user, db)
    
    db_certification = Certification(**certification.model_dump())
    db.add(db_certification)
    db.commit()
    db.refresh(db_certification)
    
    # Update profile completion
    profile.profile_completion_percentage = calculate_profile_completion(profile, db)
    db.commit()
    
    return db_certification


@router.get("/certifications", response_model=List[CertificationResponse])
def get_certifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all certifications for current user"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile.certifications


@router.put("/certifications/{certification_id}", response_model=CertificationResponse)
def update_certification(
    certification_id: int,
    certification_update: CertificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update certification"""
    certification = db.query(Certification).filter(Certification.id == certification_id).first()
    
    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    verify_profile_ownership(certification.profile_id, current_user, db)
    
    update_data = certification_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(certification, field, value)
    
    db.commit()
    db.refresh(certification)
    
    return certification


@router.delete("/certifications/{certification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certification(
    certification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete certification"""
    certification = db.query(Certification).filter(Certification.id == certification_id).first()
    
    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    verify_profile_ownership(certification.profile_id, current_user, db)
    
    db.delete(certification)
    db.commit()
    
    return None


# ============= Projects CRUD =============

@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def add_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add project to profile"""
    profile = verify_profile_ownership(project.profile_id, current_user, db)
    
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Update profile completion
    profile.profile_completion_percentage = calculate_profile_completion(profile, db)
    db.commit()
    
    return db_project


@router.get("/projects", response_model=List[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all projects for current user"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile.projects


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    verify_profile_ownership(project.profile_id, current_user, db)
    
    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    verify_profile_ownership(project.profile_id, current_user, db)
    
    db.delete(project)
    db.commit()
    
    return None


# ============= Social Links CRUD =============

@router.post("/social-links", response_model=SocialLinkResponse, status_code=status.HTTP_201_CREATED)
def add_social_link(
    link: SocialLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add social link to profile"""
    profile = verify_profile_ownership(link.profile_id, current_user, db)
    
    db_link = SocialLink(**link.model_dump())
    db.add(db_link)
    db.commit()
    db.refresh(db_link)
    
    # Update profile completion
    profile.profile_completion_percentage = calculate_profile_completion(profile, db)
    db.commit()
    
    return db_link


@router.get("/social-links", response_model=List[SocialLinkResponse])
def get_social_links(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all social links for current user"""
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile.social_links


@router.put("/social-links/{link_id}", response_model=SocialLinkResponse)
def update_social_link(
    link_id: int,
    link_update: SocialLinkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update social link"""
    link = db.query(SocialLink).filter(SocialLink.id == link_id).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Social link not found")
    
    verify_profile_ownership(link.profile_id, current_user, db)
    
    update_data = link_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(link, field, value)
    
    db.commit()
    db.refresh(link)
    
    return link


@router.delete("/social-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_social_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete social link"""
    link = db.query(SocialLink).filter(SocialLink.id == link_id).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Social link not found")
    
    verify_profile_ownership(link.profile_id, current_user, db)
    
    db.delete(link)
    db.commit()
    
    return None


# ============= Helper Functions =============

def verify_profile_ownership(profile_id: int, current_user: User, db: Session) -> CandidateProfile:
    """Verify that the current user owns the profile"""
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if current_user.role != "admin" and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this profile"
        )
    
    return profile


def calculate_profile_completion(profile: CandidateProfile, db: Session) -> int:
    """Calculate profile completion percentage"""
    total_sections = 10
    completed_sections = 0
    
    # Basic info (20%)
    if all([profile.full_name, profile.email, profile.phone, profile.current_location]):
        completed_sections += 2
    
    # Professional info (10%)
    if profile.headline and profile.bio:
        completed_sections += 1
    
    # Work experience (20%)
    if len(profile.work_experiences) > 0:
        completed_sections += 2
    
    # Education (10%)
    if len(profile.educations) > 0:
        completed_sections += 1
    
    # Skills (10%)
    if len(profile.skills) >= 3:
        completed_sections += 1
    
    # Resume (10%)
    if profile.resume_url or len(profile.resumes) > 0:
        completed_sections += 1
    
    # Projects (10%)
    if len(profile.projects) > 0:
        completed_sections += 1
    
    # Certifications (5%)
    if len(profile.certifications) > 0:
        completed_sections += 0.5
    
    # Social links (5%)
    if len(profile.social_links) > 0:
        completed_sections += 0.5
    
    return int((completed_sections / total_sections) * 100)