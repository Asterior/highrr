from __future__ import annotations

from datetime import date, datetime, timedelta
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.application import Application
from app.models.candidate_profile import (
    CandidateLanguage,
    CandidateProfile,
    CandidateSkill,
    Certification,
    Education,
    Project,
    Resume,
    SocialLink,
    WorkExperience,
)
from app.models.company_verification import CompanyVerification
from app.models.job import Job
from app.models.interview import Interview
from app.models.user import User


def get_or_create_user(db, *, name: str, email: str, password: str, role: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(name=name, email=email, password=hash_password(password), role=role)
    db.add(user)
    db.flush()
    return user


def get_or_create_job(db, *, created_by: int, title: str, **kwargs) -> Job:
    job = db.query(Job).filter(Job.created_by == created_by, Job.title == title).first()
    if job:
        for key, value in kwargs.items():
            setattr(job, key, value)
        return job
    job = Job(created_by=created_by, title=title, **kwargs)
    db.add(job)
    db.flush()
    return job


def replace_children(db, profile_id: int, model, filter_column_name: str, items: list[dict]) -> None:
    db.query(model).filter(getattr(model, filter_column_name) == profile_id).delete(synchronize_session=False)
    db.flush()
    db.add_all([model(profile_id=profile_id, **item) for item in items])


def upsert_candidate_profile(db, user: User, data: dict) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=user.id, email=user.email, full_name=data["full_name"])
        db.add(profile)
        db.flush()

    for key, value in data.items():
        if key != "children":
            setattr(profile, key, value)

    db.flush()
    children = data.get("children", {})

    replace_children(db, profile.id, WorkExperience, "profile_id", children.get("work_experiences", []))
    replace_children(db, profile.id, Education, "profile_id", children.get("educations", []))
    replace_children(db, profile.id, CandidateSkill, "profile_id", children.get("skills", []))
    replace_children(db, profile.id, Certification, "profile_id", children.get("certifications", []))
    replace_children(db, profile.id, Project, "profile_id", children.get("projects", []))
    replace_children(db, profile.id, SocialLink, "profile_id", children.get("social_links", []))
    replace_children(db, profile.id, Resume, "profile_id", children.get("resumes", []))
    replace_children(db, profile.id, CandidateLanguage, "profile_id", children.get("languages", []))

    return profile


def get_or_create_application(db, *, user: User, job: Job, status: str, score: int, notes: str, skills: list[str], experience_years: int, cgpa: float, role: str, location: str, phone: str, resume_url: str, candidate_profile: CandidateProfile) -> Application:
    application = (
        db.query(Application)
        .filter(Application.user_id == user.id, Application.job_id == job.id)
        .first()
    )
    if application:
        application.status = status
        application.score = score
        application.notes = notes
        application.skills = skills
        application.experience_years = experience_years
        application.cgpa = cgpa
        application.role = role
        application.location = location
        application.phone = phone
        application.resume_url = resume_url
        application.candidate_name = candidate_profile.full_name
        application.candidate_email = user.email
        application.candidate_location = candidate_profile.current_location
        application.current_role = candidate_profile.current_role
        application.current_company = candidate_profile.current_company
        application.highest_qualification = candidate_profile.highest_qualification
        application.profile_completion_percentage = candidate_profile.profile_completion_percentage
        application.candidate_profile_id = candidate_profile.id
        return application

    application = Application(
        user_id=user.id,
        job_id=job.id,
        candidate_profile_id=candidate_profile.id,
        candidate_name=candidate_profile.full_name,
        candidate_email=user.email,
        candidate_location=candidate_profile.current_location,
        current_role=candidate_profile.current_role,
        current_company=candidate_profile.current_company,
        highest_qualification=candidate_profile.highest_qualification,
        profile_completion_percentage=candidate_profile.profile_completion_percentage,
        status=status,
        score=score,
        notes=notes,
        skills=skills,
        experience_years=experience_years,
        avatar="".join([part[0] for part in candidate_profile.full_name.split()]).upper()[:2],
        role=role,
        location=location,
        phone=phone,
        cgpa=cgpa,
        resume_url=resume_url,
        status_history=[{"status": status, "date": datetime.utcnow().isoformat()}],
    )
    db.add(application)
    db.flush()
    return application


def get_or_create_interview(db, *, application: Application, interviewer: User, candidate_name: str, job_title: str, notes: str) -> None:
    interview = db.query(Interview).filter(Interview.application_id == application.id).first()
    if interview:
        interview.candidate_name = candidate_name
        interview.job_title = job_title
        interview.interviewer_id = interviewer.id
        interview.interviewer_name = interviewer.name
        interview.scheduled_at = datetime.utcnow() + timedelta(days=3)
        interview.status = "scheduled"
        interview.interview_type = "technical"
        interview.mode = "online"
        interview.timezone = "Asia/Kolkata"
        interview.notes = notes
        interview.meeting_link = "https://meet.highrr.local/interview"
        interview.candidate_response_status = "pending"
        interview.candidate_preferred_slots = []
        interview.status_history = [{"status": "scheduled", "date": datetime.utcnow().isoformat()}]
        return

    db.add(
        Interview(
            application_id=application.id,
            candidate_name=candidate_name,
            job_title=job_title,
            interviewer_id=interviewer.id,
            interviewer_name=interviewer.name,
            scheduled_at=datetime.utcnow() + timedelta(days=3),
            status="scheduled",
            interview_type="technical",
            mode="online",
            timezone="Asia/Kolkata",
            notes=notes,
            meeting_link="https://meet.highrr.local/interview",
            candidate_response_status="pending",
            candidate_preferred_slots=[],
            status_history=[{"status": "scheduled", "date": datetime.utcnow().isoformat()}],
        )
    )


def seed_demo_data(db):
    recruiter = get_or_create_user(
        db,
        name="Ananya",
        email="ananya@gmail.com",
        password="ananya123",
        role="recruiter",
    )
    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter.id).first()
    if company:
        company.company_name = company.company_name or "Ananya Talent Pvt Ltd"

    jobs = [
        get_or_create_job(
            db,
            created_by=recruiter.id,
            title="Frontend Engineer",
            description="Build recruiter-facing dashboards and candidate workflows using React and TypeScript.",
            location="Bengaluru",
            salary="12-18 LPA",
            job_type="full-time",
            required_skills=["React", "TypeScript", "Redux", "REST APIs"],
            experience_required="2-4 years",
            is_active=True,
            department="Engineering",
            status="Active",
            application_count=0,
        ),
        get_or_create_job(
            db,
            created_by=recruiter.id,
            title="Backend Engineer",
            description="Design FastAPI services, PostgreSQL schemas, and verification workflows.",
            location="Remote",
            salary="14-20 LPA",
            job_type="full-time",
            required_skills=["Python", "FastAPI", "PostgreSQL", "SQLAlchemy"],
            experience_required="3-5 years",
            is_active=True,
            department="Engineering",
            status="Active",
            application_count=0,
        ),
        get_or_create_job(
            db,
            created_by=recruiter.id,
            title="Data Analyst",
            description="Turn hiring and product metrics into clear dashboards and weekly insights.",
            location="Hyderabad",
            salary="9-14 LPA",
            job_type="full-time",
            required_skills=["SQL", "Excel", "Power BI", "Python"],
            experience_required="2-4 years",
            is_active=True,
            department="Data",
            status="Active",
            application_count=0,
        ),
        get_or_create_job(
            db,
            created_by=recruiter.id,
            title="DevOps Engineer",
            description="Own CI/CD pipelines, cloud deployment, and observability for production releases.",
            location="Pune",
            salary="15-22 LPA",
            job_type="full-time",
            required_skills=["Docker", "Kubernetes", "AWS", "CI/CD"],
            experience_required="4-6 years",
            is_active=True,
            department="Platform",
            status="Active",
            application_count=0,
        ),
        get_or_create_job(
            db,
            created_by=recruiter.id,
            title="QA Automation Engineer",
            description="Build robust automation coverage for web and API flows across the hiring platform.",
            location="Chennai",
            salary="8-12 LPA",
            job_type="full-time",
            required_skills=["Playwright", "Selenium", "Python", "API Testing"],
            experience_required="2-4 years",
            is_active=True,
            department="Quality",
            status="Active",
            application_count=0,
        ),
        get_or_create_job(
            db,
            created_by=recruiter.id,
            title="Product Designer",
            description="Craft intuitive hiring journeys, dashboards, and presentation-ready product flows.",
            location="Mumbai",
            salary="11-17 LPA",
            job_type="full-time",
            required_skills=["Figma", "User Research", "Design Systems", "Prototyping"],
            experience_required="3-5 years",
            is_active=True,
            department="Design",
            status="Active",
            application_count=0,
        ),
    ]

    candidate_specs = [
        {
            "name": "Aditi Sharma",
            "email": "aditi.sharma91@gmail.com",
            "password": "Aditi1234",
            "profile": {
                "full_name": "Aditi Sharma",
                "email": "aditi.sharma91@gmail.com",
                "phone": "+91-9876500101",
                "date_of_birth": date(1997, 8, 14),
                "gender": "Female",
                "current_location": "Bengaluru",
                "city": "Bengaluru",
                "state": "Karnataka",
                "country": "India",
                "postal_code": "560102",
                "headline": "Frontend Engineer",
                "bio": "Frontend engineer focused on clean UI systems, component libraries, and reliable product experiences.",
                "current_role": "Frontend Engineer",
                "current_company": "Nexora Labs",
                "total_experience_years": 3.5,
                "notice_period_days": 30,
                "current_salary": 950000,
                "expected_salary": 1500000,
                "currency": "INR",
                "highest_qualification": "B.Tech",
                "cgpa": 8.7,
                "avatar_url": "https://example.com/avatars/aditi.jpg",
                "resume_url": "https://example.com/resumes/aditi-sharma.pdf",
                "preferred_locations": ["Bengaluru", "Remote"],
                "preferred_job_types": ["full-time"],
                "willing_to_relocate": True,
                "open_to_remote": True,
                "is_active_job_seeker": True,
                "availability": "30days",
                "profile_completion_percentage": 100,
                "children": {
                    "skills": [
                        {"skill_name": "React", "category": "technical", "proficiency_level": "expert", "years_of_experience": 3, "is_primary": True},
                        {"skill_name": "TypeScript", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 2.5},
                        {"skill_name": "Redux", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 2},
                        {"skill_name": "Figma", "category": "tool", "proficiency_level": "intermediate", "years_of_experience": 1.5},
                    ],
                    "educations": [
                        {"institution_name": "Delhi Technological University", "degree": "B.Tech", "field_of_study": "Computer Science", "start_date": date(2015, 7, 1), "end_date": date(2019, 5, 31), "grade": "8.7 CGPA", "grade_type": "cgpa", "location": "Delhi", "description": "Focused on web engineering and UI systems."},
                    ],
                    "work_experiences": [
                        {"company_name": "Nexora Labs", "job_title": "Frontend Engineer", "employment_type": "full-time", "location": "Bengaluru", "is_remote": False, "start_date": date(2022, 1, 10), "description": "Built recruiter dashboards and candidate flows.", "responsibilities": ["Built reusable React components", "Improved onboarding flow"], "achievements": ["Reduced page load time by 35%", "Launched design system"], "skills_used": ["React", "TypeScript", "Redux"]},
                    ],
                    "projects": [
                        {"title": "Hiring Dashboard Revamp", "description": "Redesigned the recruiter dashboard with a cleaner information hierarchy and faster workflows.", "role": "Lead Developer", "is_ongoing": False, "project_url": "https://example.com/projects/hiring-dashboard", "github_url": "https://github.com/example/hiring-dashboard", "technologies_used": ["React", "TypeScript", "Tailwind CSS"], "key_features": ["Responsive dashboard", "Role-aware navigation"], "team_size": 3},
                    ],
                    "certifications": [
                        {"name": "Frontend Developer Nanodegree", "issuing_organization": "Udacity", "does_not_expire": True, "credential_url": "https://example.com/certs/aditi-frontend", "description": "Advanced frontend architecture and component design.", "skills_acquired": ["React", "TypeScript", "Accessibility"]},
                    ],
                    "social_links": [
                        {"platform": "linkedin", "url": "https://linkedin.com/in/aditi-sharma91", "display_name": "Aditi Sharma", "is_verified": True, "is_public": True},
                        {"platform": "github", "url": "https://github.com/aditi-sharma91", "display_name": "aditi-sharma91", "is_verified": False, "is_public": True},
                    ],
                    "resumes": [
                        {"title": "Aditi Sharma - Frontend Resume", "file_url": "https://example.com/resumes/aditi-front-end.pdf", "file_name": "aditi-front-end.pdf", "file_size": 245_000, "ats_score": 91.0, "ats_feedback": {"summary": "Strong frontend match"}, "parsed_data": {"skills": ["React", "TypeScript"]}, "is_primary": True, "is_ats_optimized": True, "version": 1},
                    ],
                    "languages": [
                        {"language": "English", "proficiency": "fluent", "can_read": True, "can_write": True, "can_speak": True},
                        {"language": "Hindi", "proficiency": "native", "can_read": True, "can_write": True, "can_speak": True},
                    ],
                },
            },
        },
        {
            "name": "Rohan Iyer",
            "email": "rohan.iyer88@gmail.com",
            "password": "Rohan1234",
            "profile": {
                "full_name": "Rohan Iyer",
                "email": "rohan.iyer88@gmail.com",
                "phone": "+91-9876500102",
                "date_of_birth": date(1995, 2, 21),
                "gender": "Male",
                "current_location": "Hyderabad",
                "city": "Hyderabad",
                "state": "Telangana",
                "country": "India",
                "postal_code": "500081",
                "headline": "Backend Engineer",
                "bio": "Backend engineer building secure APIs, data models, and automated verification services.",
                "current_role": "Software Engineer",
                "current_company": "CodeAxis",
                "total_experience_years": 4.0,
                "notice_period_days": 60,
                "current_salary": 1300000,
                "expected_salary": 1900000,
                "currency": "INR",
                "highest_qualification": "B.Tech",
                "cgpa": 8.4,
                "avatar_url": "https://example.com/avatars/rohan.jpg",
                "resume_url": "https://example.com/resumes/rohan-iyer.pdf",
                "preferred_locations": ["Hyderabad", "Remote"],
                "preferred_job_types": ["full-time"],
                "willing_to_relocate": False,
                "open_to_remote": True,
                "is_active_job_seeker": True,
                "availability": "60days",
                "profile_completion_percentage": 98,
                "children": {
                    "skills": [
                        {"skill_name": "Python", "category": "technical", "proficiency_level": "expert", "years_of_experience": 4, "is_primary": True},
                        {"skill_name": "FastAPI", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 3},
                        {"skill_name": "PostgreSQL", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 4},
                        {"skill_name": "SQLAlchemy", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 3},
                    ],
                    "educations": [
                        {"institution_name": "NIT Trichy", "degree": "B.Tech", "field_of_study": "Information Technology", "start_date": date(2013, 7, 1), "end_date": date(2017, 5, 31), "grade": "8.4 CGPA", "grade_type": "cgpa", "location": "Tiruchirappalli", "description": "Backend systems and data engineering."},
                    ],
                    "work_experiences": [
                        {"company_name": "CodeAxis", "job_title": "Software Engineer", "employment_type": "full-time", "location": "Hyderabad", "is_remote": False, "start_date": date(2021, 5, 3), "description": "Built APIs and internal admin services.", "responsibilities": ["Owned FastAPI endpoints", "Optimized database queries"], "achievements": ["Cut API latency by 40%", "Delivered secure OTP workflows"], "skills_used": ["Python", "FastAPI", "PostgreSQL"]},
                    ],
                    "projects": [
                        {"title": "Interview Scheduler API", "description": "Created the scheduling backend for interviews with reminders and status tracking.", "role": "Developer", "is_ongoing": False, "project_url": "https://example.com/projects/interview-scheduler", "github_url": "https://github.com/example/interview-scheduler", "technologies_used": ["Python", "FastAPI", "PostgreSQL"], "key_features": ["Calendar links", "Reminder jobs"], "team_size": 2},
                    ],
                    "certifications": [
                        {"name": "API Design Certificate", "issuing_organization": "Coursera", "does_not_expire": True, "credential_url": "https://example.com/certs/rohan-api", "description": "REST API design and implementation.", "skills_acquired": ["FastAPI", "REST", "Testing"]},
                    ],
                    "social_links": [
                        {"platform": "linkedin", "url": "https://linkedin.com/in/rohan-iyer88", "display_name": "Rohan Iyer", "is_verified": True, "is_public": True},
                        {"platform": "github", "url": "https://github.com/rohaniyer88", "display_name": "rohaniyer88", "is_verified": False, "is_public": True},
                    ],
                    "resumes": [
                        {"title": "Rohan Iyer - Backend Resume", "file_url": "https://example.com/resumes/rohan-backend.pdf", "file_name": "rohan-backend.pdf", "file_size": 256_000, "ats_score": 94.0, "ats_feedback": {"summary": "Excellent backend match"}, "parsed_data": {"skills": ["Python", "FastAPI"]}, "is_primary": True, "is_ats_optimized": True, "version": 1},
                    ],
                    "languages": [
                        {"language": "English", "proficiency": "fluent", "can_read": True, "can_write": True, "can_speak": True},
                        {"language": "Telugu", "proficiency": "conversational", "can_read": True, "can_write": False, "can_speak": True},
                    ],
                },
            },
        },
        {
            "name": "Neha Singh",
            "email": "neha.singh.data@gmail.com",
            "password": "Neha1234",
            "profile": {
                "full_name": "Neha Singh",
                "email": "neha.singh.data@gmail.com",
                "phone": "+91-9876500103",
                "date_of_birth": date(1996, 11, 9),
                "gender": "Female",
                "current_location": "Noida",
                "city": "Noida",
                "state": "Uttar Pradesh",
                "country": "India",
                "postal_code": "201301",
                "headline": "Data Analyst",
                "bio": "Data analyst who translates business metrics into dashboards and hiring insights.",
                "current_role": "Data Analyst",
                "current_company": "MetricHive",
                "total_experience_years": 3.0,
                "notice_period_days": 45,
                "current_salary": 900000,
                "expected_salary": 1350000,
                "currency": "INR",
                "highest_qualification": "MBA",
                "cgpa": 8.9,
                "avatar_url": "https://example.com/avatars/neha.jpg",
                "resume_url": "https://example.com/resumes/neha-singh.pdf",
                "preferred_locations": ["Noida", "Delhi", "Remote"],
                "preferred_job_types": ["full-time"],
                "willing_to_relocate": True,
                "open_to_remote": True,
                "is_active_job_seeker": True,
                "availability": "45days",
                "profile_completion_percentage": 100,
                "children": {
                    "skills": [
                        {"skill_name": "SQL", "category": "technical", "proficiency_level": "expert", "years_of_experience": 3, "is_primary": True},
                        {"skill_name": "Power BI", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 2.5},
                        {"skill_name": "Excel", "category": "technical", "proficiency_level": "expert", "years_of_experience": 4},
                        {"skill_name": "Python", "category": "technical", "proficiency_level": "intermediate", "years_of_experience": 2},
                    ],
                    "educations": [
                        {"institution_name": "Banaras Hindu University", "degree": "MBA", "field_of_study": "Business Analytics", "start_date": date(2017, 7, 1), "end_date": date(2019, 5, 31), "grade": "8.9 CGPA", "grade_type": "cgpa", "location": "Varanasi", "description": "Applied analytics and reporting in business contexts."},
                    ],
                    "work_experiences": [
                        {"company_name": "MetricHive", "job_title": "Data Analyst", "employment_type": "full-time", "location": "Noida", "is_remote": False, "start_date": date(2022, 3, 14), "description": "Built hiring and product dashboards.", "responsibilities": ["Built executive dashboards", "Analysed funnel drop-offs"], "achievements": ["Improved reporting speed by 50%"], "skills_used": ["SQL", "Power BI", "Python"]},
                    ],
                    "projects": [
                        {"title": "Recruitment Insights Dashboard", "description": "Analytics dashboard for recruiter activity, interview throughput, and hiring funnel metrics.", "role": "Analyst", "is_ongoing": False, "project_url": "https://example.com/projects/recruitment-insights", "github_url": "https://github.com/example/recruitment-insights", "technologies_used": ["SQL", "Power BI", "Python"], "key_features": ["Funnel analysis", "Weekly reporting"], "team_size": 2},
                    ],
                    "certifications": [
                        {"name": "Business Analytics Specialization", "issuing_organization": "Coursera", "does_not_expire": True, "credential_url": "https://example.com/certs/neha-analytics", "description": "Data visualization and business analysis.", "skills_acquired": ["SQL", "Dashboards", "Analytics"]},
                    ],
                    "social_links": [
                        {"platform": "linkedin", "url": "https://linkedin.com/in/neha-singh-data", "display_name": "Neha Singh", "is_verified": True, "is_public": True},
                    ],
                    "resumes": [
                        {"title": "Neha Singh - Data Resume", "file_url": "https://example.com/resumes/neha-data.pdf", "file_name": "neha-data.pdf", "file_size": 248_000, "ats_score": 89.0, "ats_feedback": {"summary": "Strong analytics profile"}, "parsed_data": {"skills": ["SQL", "Power BI"]}, "is_primary": True, "is_ats_optimized": True, "version": 1},
                    ],
                    "languages": [
                        {"language": "English", "proficiency": "fluent", "can_read": True, "can_write": True, "can_speak": True},
                        {"language": "Hindi", "proficiency": "native", "can_read": True, "can_write": True, "can_speak": True},
                    ],
                },
            },
        },
        {
            "name": "Karan Mehta",
            "email": "karan.mehta.dev@gmail.com",
            "password": "Karan1234",
            "profile": {
                "full_name": "Karan Mehta",
                "email": "karan.mehta.dev@gmail.com",
                "phone": "+91-9876500104",
                "date_of_birth": date(1994, 6, 5),
                "gender": "Male",
                "current_location": "Pune",
                "city": "Pune",
                "state": "Maharashtra",
                "country": "India",
                "postal_code": "411045",
                "headline": "DevOps Engineer",
                "bio": "DevOps engineer focused on deployment pipelines, infrastructure reliability, and release automation.",
                "current_role": "DevOps Engineer",
                "current_company": "CloudPilot",
                "total_experience_years": 5.0,
                "notice_period_days": 30,
                "current_salary": 1600000,
                "expected_salary": 2200000,
                "currency": "INR",
                "highest_qualification": "B.Tech",
                "cgpa": 8.2,
                "avatar_url": "https://example.com/avatars/karan.jpg",
                "resume_url": "https://example.com/resumes/karan-mehta.pdf",
                "preferred_locations": ["Pune", "Bengaluru", "Remote"],
                "preferred_job_types": ["full-time"],
                "willing_to_relocate": True,
                "open_to_remote": True,
                "is_active_job_seeker": True,
                "availability": "30days",
                "profile_completion_percentage": 99,
                "children": {
                    "skills": [
                        {"skill_name": "Docker", "category": "technical", "proficiency_level": "expert", "years_of_experience": 4, "is_primary": True},
                        {"skill_name": "Kubernetes", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 3.5},
                        {"skill_name": "AWS", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 4},
                        {"skill_name": "CI/CD", "category": "technical", "proficiency_level": "expert", "years_of_experience": 4.5},
                    ],
                    "educations": [
                        {"institution_name": "Pune Institute of Computer Technology", "degree": "B.Tech", "field_of_study": "Computer Engineering", "start_date": date(2012, 7, 1), "end_date": date(2016, 5, 31), "grade": "8.2 CGPA", "grade_type": "cgpa", "location": "Pune", "description": "Cloud infrastructure and system design."},
                    ],
                    "work_experiences": [
                        {"company_name": "CloudPilot", "job_title": "DevOps Engineer", "employment_type": "full-time", "location": "Pune", "is_remote": False, "start_date": date(2020, 8, 17), "description": "Automated deployments and infrastructure monitoring.", "responsibilities": ["Managed CI/CD", "Improved release reliability"], "achievements": ["Reduced deployment failures by 60%"], "skills_used": ["Docker", "Kubernetes", "AWS"]},
                    ],
                    "projects": [
                        {"title": "Release Automation Platform", "description": "Internal platform for faster deployments and rollback-safe releases.", "role": "Owner", "is_ongoing": False, "project_url": "https://example.com/projects/release-automation", "github_url": "https://github.com/example/release-automation", "technologies_used": ["AWS", "Docker", "GitHub Actions"], "key_features": ["Zero-downtime deploys", "Monitoring alerts"], "team_size": 4},
                    ],
                    "certifications": [
                        {"name": "AWS Certified Solutions Architect", "issuing_organization": "AWS", "does_not_expire": True, "credential_url": "https://example.com/certs/karan-aws", "description": "Cloud architecture and deployment.", "skills_acquired": ["AWS", "Networking", "Security"]},
                    ],
                    "social_links": [
                        {"platform": "linkedin", "url": "https://linkedin.com/in/karan-mehta-dev", "display_name": "Karan Mehta", "is_verified": True, "is_public": True},
                    ],
                    "resumes": [
                        {"title": "Karan Mehta - DevOps Resume", "file_url": "https://example.com/resumes/karan-devops.pdf", "file_name": "karan-devops.pdf", "file_size": 260_000, "ats_score": 92.0, "ats_feedback": {"summary": "Strong DevOps profile"}, "parsed_data": {"skills": ["AWS", "Docker"]}, "is_primary": True, "is_ats_optimized": True, "version": 1},
                    ],
                    "languages": [
                        {"language": "English", "proficiency": "fluent", "can_read": True, "can_write": True, "can_speak": True},
                        {"language": "Marathi", "proficiency": "native", "can_read": True, "can_write": True, "can_speak": True},
                    ],
                },
            },
        },
        {
            "name": "Isha Verma",
            "email": "isha.verma.qa@gmail.com",
            "password": "Isha1234",
            "profile": {
                "full_name": "Isha Verma",
                "email": "isha.verma.qa@gmail.com",
                "phone": "+91-9876500105",
                "date_of_birth": date(1998, 4, 18),
                "gender": "Female",
                "current_location": "Chennai",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "country": "India",
                "postal_code": "600042",
                "headline": "QA Automation Engineer",
                "bio": "QA automation engineer focused on stable test suites and release confidence across web apps.",
                "current_role": "QA Engineer",
                "current_company": "TestWave",
                "total_experience_years": 2.8,
                "notice_period_days": 15,
                "current_salary": 820000,
                "expected_salary": 1200000,
                "currency": "INR",
                "highest_qualification": "B.Tech",
                "cgpa": 8.5,
                "avatar_url": "https://example.com/avatars/isha.jpg",
                "resume_url": "https://example.com/resumes/isha-verma.pdf",
                "preferred_locations": ["Chennai", "Remote"],
                "preferred_job_types": ["full-time"],
                "willing_to_relocate": False,
                "open_to_remote": True,
                "is_active_job_seeker": True,
                "availability": "15days",
                "profile_completion_percentage": 97,
                "children": {
                    "skills": [
                        {"skill_name": "Playwright", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 2, "is_primary": True},
                        {"skill_name": "Selenium", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 2.5},
                        {"skill_name": "API Testing", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 2},
                        {"skill_name": "Python", "category": "technical", "proficiency_level": "intermediate", "years_of_experience": 1.5},
                    ],
                    "educations": [
                        {"institution_name": "VIT Vellore", "degree": "B.Tech", "field_of_study": "Information Technology", "start_date": date(2016, 7, 1), "end_date": date(2020, 5, 31), "grade": "8.5 CGPA", "grade_type": "cgpa", "location": "Vellore", "description": "Software testing and automation practices."},
                    ],
                    "work_experiences": [
                        {"company_name": "TestWave", "job_title": "QA Engineer", "employment_type": "full-time", "location": "Chennai", "is_remote": False, "start_date": date(2021, 7, 5), "description": "Built regression and API automation suites.", "responsibilities": ["Created end-to-end tests", "Maintained regression coverage"], "achievements": ["Cut manual regression effort by 70%"], "skills_used": ["Playwright", "Selenium", "Python"]},
                    ],
                    "projects": [
                        {"title": "Automation Suite for Job Portal", "description": "Browser and API test suite covering job posting and verification flows.", "role": "QA Owner", "is_ongoing": False, "project_url": "https://example.com/projects/qa-suite", "github_url": "https://github.com/example/qa-suite", "technologies_used": ["Playwright", "Python", "GitHub Actions"], "key_features": ["CI test runs", "Smoke coverage"], "team_size": 2},
                    ],
                    "certifications": [
                        {"name": "Automation Testing Professional", "issuing_organization": "Udemy", "does_not_expire": True, "credential_url": "https://example.com/certs/isha-qa", "description": "Automated browser and API testing.", "skills_acquired": ["Testing", "Playwright", "Selenium"]},
                    ],
                    "social_links": [
                        {"platform": "linkedin", "url": "https://linkedin.com/in/isha-verma-qa", "display_name": "Isha Verma", "is_verified": True, "is_public": True},
                    ],
                    "resumes": [
                        {"title": "Isha Verma - QA Resume", "file_url": "https://example.com/resumes/isha-qa.pdf", "file_name": "isha-qa.pdf", "file_size": 242_000, "ats_score": 90.0, "ats_feedback": {"summary": "Strong test automation match"}, "parsed_data": {"skills": ["Playwright", "Selenium"]}, "is_primary": True, "is_ats_optimized": True, "version": 1},
                    ],
                    "languages": [
                        {"language": "English", "proficiency": "fluent", "can_read": True, "can_write": True, "can_speak": True},
                        {"language": "Tamil", "proficiency": "native", "can_read": True, "can_write": True, "can_speak": True},
                    ],
                },
            },
        },
        {
            "name": "Vikram Rao",
            "email": "vikram.rao.mobile@gmail.com",
            "password": "Vikram1234",
            "profile": {
                "full_name": "Vikram Rao",
                "email": "vikram.rao.mobile@gmail.com",
                "phone": "+91-9876500106",
                "date_of_birth": date(1993, 9, 30),
                "gender": "Male",
                "current_location": "Mumbai",
                "city": "Mumbai",
                "state": "Maharashtra",
                "country": "India",
                "postal_code": "400076",
                "headline": "Mobile App Developer",
                "bio": "Mobile developer shipping reliable Android and cross-platform user experiences.",
                "current_role": "Senior Mobile Developer",
                "current_company": "AppOrbit",
                "total_experience_years": 5.5,
                "notice_period_days": 45,
                "current_salary": 1700000,
                "expected_salary": 2300000,
                "currency": "INR",
                "highest_qualification": "B.Tech",
                "cgpa": 8.1,
                "avatar_url": "https://example.com/avatars/vikram.jpg",
                "resume_url": "https://example.com/resumes/vikram-rao.pdf",
                "preferred_locations": ["Mumbai", "Bengaluru", "Remote"],
                "preferred_job_types": ["full-time"],
                "willing_to_relocate": True,
                "open_to_remote": True,
                "is_active_job_seeker": True,
                "availability": "45days",
                "profile_completion_percentage": 99,
                "children": {
                    "skills": [
                        {"skill_name": "React Native", "category": "technical", "proficiency_level": "expert", "years_of_experience": 4, "is_primary": True},
                        {"skill_name": "Android", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 5},
                        {"skill_name": "Kotlin", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 4.5},
                        {"skill_name": "Firebase", "category": "technical", "proficiency_level": "advanced", "years_of_experience": 3},
                    ],
                    "educations": [
                        {"institution_name": "SRM Institute of Science and Technology", "degree": "B.Tech", "field_of_study": "Computer Science", "start_date": date(2010, 7, 1), "end_date": date(2014, 5, 31), "grade": "8.1 CGPA", "grade_type": "cgpa", "location": "Chennai", "description": "Mobile application development and UI systems."},
                    ],
                    "work_experiences": [
                        {"company_name": "AppOrbit", "job_title": "Senior Mobile Developer", "employment_type": "full-time", "location": "Mumbai", "is_remote": False, "start_date": date(2020, 11, 2), "description": "Built mobile apps and release pipelines.", "responsibilities": ["Shipped app updates", "Improved crash rates"], "achievements": ["Raised store rating to 4.6"], "skills_used": ["React Native", "Kotlin", "Firebase"]},
                    ],
                    "projects": [
                        {"title": "Candidate Mobile Companion App", "description": "Mobile companion app for candidates to track applications and interviews.", "role": "Lead", "is_ongoing": False, "project_url": "https://example.com/projects/mobile-companion", "github_url": "https://github.com/example/mobile-companion", "technologies_used": ["React Native", "Firebase", "Kotlin"], "key_features": ["Push notifications", "Interview reminders"], "team_size": 4},
                    ],
                    "certifications": [
                        {"name": "Android App Development", "issuing_organization": "Google", "does_not_expire": True, "credential_url": "https://example.com/certs/vikram-android", "description": "Android architecture and app delivery.", "skills_acquired": ["Android", "Kotlin", "Testing"]},
                    ],
                    "social_links": [
                        {"platform": "linkedin", "url": "https://linkedin.com/in/vikram-rao-mobile", "display_name": "Vikram Rao", "is_verified": True, "is_public": True},
                    ],
                    "resumes": [
                        {"title": "Vikram Rao - Mobile Resume", "file_url": "https://example.com/resumes/vikram-mobile.pdf", "file_name": "vikram-mobile.pdf", "file_size": 265_000, "ats_score": 93.0, "ats_feedback": {"summary": "Strong mobile engineering profile"}, "parsed_data": {"skills": ["React Native", "Kotlin"]}, "is_primary": True, "is_ats_optimized": True, "version": 1},
                    ],
                    "languages": [
                        {"language": "English", "proficiency": "fluent", "can_read": True, "can_write": True, "can_speak": True},
                        {"language": "Hindi", "proficiency": "fluent", "can_read": True, "can_write": True, "can_speak": True},
                    ],
                },
            },
        },
    ]

    candidate_records: list[tuple[User, CandidateProfile]] = []
    for spec in candidate_specs:
        user = get_or_create_user(db, name=spec["name"], email=spec["email"], password=spec["password"], role="candidate")
        profile = upsert_candidate_profile(db, user, spec["profile"])
        candidate_records.append((user, profile))

    status_cycle = ["shortlisted", "applied", "interview", "shortlisted", "applied", "interview"]
    score_cycle = [92, 85, 88, 90, 83, 91]
    notes_cycle = [
        "Strong frontend fit for demo presentation.",
        "Backend profile aligned with platform services.",
        "Analytics profile ready for executive dashboards.",
        "DevOps candidate with good release discipline.",
        "QA automation skills fit the demo flows.",
        "Mobile experience matches consumer product needs.",
    ]
    application_pairs = [
        (candidate_records[0], jobs[0]),
        (candidate_records[1], jobs[1]),
        (candidate_records[2], jobs[2]),
        (candidate_records[3], jobs[3]),
        (candidate_records[4], jobs[4]),
        (candidate_records[5], jobs[5]),
    ]

    for idx, ((user, profile), job) in enumerate(application_pairs):
        skill_names = [skill.skill_name for skill in profile.skills] if profile.skills else list(job.required_skills or [])
        application = get_or_create_application(
            db,
            user=user,
            job=job,
            status=status_cycle[idx],
            score=score_cycle[idx],
            notes=notes_cycle[idx],
            skills=skill_names,
            experience_years=int(profile.total_experience_years or 0),
            cgpa=float(profile.cgpa or 0),
            role=job.title,
            location=profile.current_location or job.location or "India",
            phone=profile.phone or user.email,
            resume_url=profile.resume_url or "",
            candidate_profile=profile,
        )
        job.application_count = (job.application_count or 0) + 1
        if status_cycle[idx] in {"shortlisted", "interview"}:
            get_or_create_interview(
                db,
                application=application,
                interviewer=recruiter,
                candidate_name=profile.full_name,
                job_title=job.title,
                notes=f"Demo interview for {profile.full_name} on {job.title}.",
            )

    db.flush()


def main():
    db = SessionLocal()
    try:
        seed_demo_data(db)
        db.commit()
        print("Demo entries added successfully.")
        print("Added 6 candidate profiles, 6 jobs, applications, interviews, and full profile artifacts.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()