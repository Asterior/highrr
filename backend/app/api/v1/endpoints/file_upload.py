from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
from datetime import datetime
from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.ats_engine import build_candidate_ats_snapshot
from app.models.user import User
from app.models.candidate_profile import CandidateProfile, Resume, Certification
from app.schemas.candidate_profile import ResumeCreate, ResumeResponse

router = APIRouter(prefix="/profile/upload", tags=["File Upload"])

# Configuration
UPLOAD_DIR = "/home/claude/uploads"
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}
ALLOWED_CERTIFICATE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def ensure_upload_dir():
    """Ensure upload directory exists"""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(f"{UPLOAD_DIR}/resumes", exist_ok=True)
    os.makedirs(f"{UPLOAD_DIR}/certificates", exist_ok=True)
    os.makedirs(f"{UPLOAD_DIR}/avatars", exist_ok=True)


def save_file(file: UploadFile, subdirectory: str) -> tuple[str, str, int]:
    """
    Save uploaded file and return (file_path, file_name, file_size)
    """
    ensure_upload_dir()
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = f"{UPLOAD_DIR}/{subdirectory}/{unique_filename}"
    
    # Save file
    file_content = file.file.read()
    file_size = len(file_content)
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Return relative path for storage
    relative_path = f"/uploads/{subdirectory}/{unique_filename}"
    
    return relative_path, file.filename, file_size


def validate_file(file: UploadFile, allowed_extensions: set, max_size: int):
    """Validate file extension and size"""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Read file to check size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {max_size / (1024*1024)}MB"
        )


@router.post("/resume", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    title: str = "My Resume",
    is_primary: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a resume file
    
    - **file**: PDF, DOC, or DOCX file
    - **title**: Resume title (e.g., "Software Engineer Resume")
    - **is_primary**: Set as primary resume
    """
    # Validate file
    validate_file(file, ALLOWED_RESUME_EXTENSIONS, MAX_FILE_SIZE)
    
    # Get user's profile
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Create a profile first."
        )
    
    # Save file
    file_url, original_filename, file_size = save_file(file, "resumes")
    
    # If setting as primary, unset other primary resumes
    if is_primary:
        db.query(Resume).filter(
            Resume.profile_id == profile.id,
            Resume.is_primary == True
        ).update({"is_primary": False})
    
    # Get next version number
    max_version = db.query(Resume).filter(
        Resume.profile_id == profile.id
    ).count()
    
    # Create resume record
    resume = Resume(
        profile_id=profile.id,
        title=title,
        file_url=file_url,
        file_name=original_filename,
        file_size=file_size,
        is_primary=is_primary,
        version=max_version + 1
    )
    
    db.add(resume)
    
    # Update profile's primary resume URL if this is primary
    if is_primary:
        profile.resume_url = file_url
    
    db.commit()
    db.refresh(resume)
    
    return resume


@router.get("/resumes", response_model=list[ResumeResponse])
def list_my_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Create a profile first.",
        )

    return (
        db.query(Resume)
        .filter(Resume.profile_id == profile.id)
        .order_by(Resume.created_at.desc())
        .all()
    )


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload profile avatar/picture
    
    - **file**: JPG, JPEG, PNG, or GIF file
    """
    # Validate file
    validate_file(file, ALLOWED_AVATAR_EXTENSIONS, 5 * 1024 * 1024)  # 5MB for images
    
    # Get user's profile
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Create a profile first."
        )
    
    # Save file
    file_url, original_filename, file_size = save_file(file, "avatars")
    
    # Delete old avatar if exists
    if profile.avatar_url:
        old_file_path = f"{UPLOAD_DIR}{profile.avatar_url.replace('/uploads', '')}"
        if os.path.exists(old_file_path):
            os.remove(old_file_path)
    
    # Update profile
    profile.avatar_url = file_url
    db.commit()
    
    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": file_url,
        "file_size": file_size
    }


@router.post("/certificate")
async def upload_certificate(
    file: UploadFile = File(...),
    certification_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload certificate file and optionally attach to certification
    
    - **file**: PDF, JPG, JPEG, or PNG file
    - **certification_id**: Optional certification ID to attach file to
    """
    # Validate file
    validate_file(file, ALLOWED_CERTIFICATE_EXTENSIONS, MAX_FILE_SIZE)
    
    # Get user's profile
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Create a profile first."
        )
    
    # Save file
    file_url, original_filename, file_size = save_file(file, "certificates")
    
    # If certification_id provided, update that certification
    if certification_id:
        certification = db.query(Certification).filter(
            Certification.id == certification_id,
            Certification.profile_id == profile.id
        ).first()
        
        if not certification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certification not found"
            )
        
        certification.certificate_file_url = file_url
        db.commit()
    
    return {
        "message": "Certificate uploaded successfully",
        "file_url": file_url,
        "file_name": original_filename,
        "file_size": file_size
    }


@router.get("/resume/{resume_id}")
def get_resume_file(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get resume file details"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Check authorization
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.id == resume.profile_id
    ).first()
    
    if current_user.role == "candidate" and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this resume"
        )
    
    return {
        "id": resume.id,
        "title": resume.title,
        "file_url": resume.file_url,
        "file_name": resume.file_name,
        "file_size": resume.file_size,
        "ats_score": resume.ats_score,
        "created_at": resume.created_at
    }


@router.delete("/resume/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete resume file"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Check authorization
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.id == resume.profile_id
    ).first()
    
    if profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this resume"
        )
    
    # Delete physical file
    file_path = f"{UPLOAD_DIR}{resume.file_url.replace('/uploads', '')}"
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete database record
    db.delete(resume)
    db.commit()
    
    return None


@router.post("/ats-score/{resume_id}")
async def update_ats_score(
    resume_id: int,
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Refresh ATS score for a resume using the platform ATS engine.
    
    - **resume_id**: Resume ID
    - **job_id**: Optional specific job id to evaluate against
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Check authorization
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.id == resume.profile_id
    ).first()
    
    if profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this resume"
        )
    
    try:
        snapshot = build_candidate_ats_snapshot(db, current_user.id, job_id=job_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    resume.ats_score = snapshot["average_score"]
    resume.ats_feedback = {
        "source": "analytics_engine",
        "job_id": job_id,
        "total_jobs_evaluated": snapshot["total_jobs_evaluated"],
        "top_recommendations": snapshot["top_recommendations"],
        "results": snapshot["results"][:5],
    }
    resume.is_ats_optimized = resume.ats_score >= 75
    
    db.commit()
    db.refresh(resume)
    
    return {
        "message": "ATS score refreshed successfully",
        "resume_id": resume.id,
        "ats_score": resume.ats_score,
        "is_ats_optimized": resume.is_ats_optimized
    }