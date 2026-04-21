from datetime import datetime, timedelta
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, text

from app.core.security import hash_password
from app.db.session import SessionLocal, engine
from app.models.application import Application
from app.models.candidate_profile import CandidateProfile, CandidateSkill
from app.models.company_verification import CompanyVerification
from app.models.interview import Interview
from app.models.job import Job
from app.models.recruiter_reputation import RecruiterReputation
from app.models.user import User

# NEVER run this in production.


def clear_tables(db):
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    deletion_order = [
        "messages",
        "conversations",
        "interviews",
        "applications",
        "candidate_languages",
        "resumes",
        "social_links",
        "projects",
        "certifications",
        "candidate_skills",
        "educations",
        "work_experiences",
        "candidate_profiles",
        "user_reports",
        "recruiter_reputations",
        "company_verifications",
        "jobs",
        "users",
    ]

    for table in deletion_order:
        if table in existing_tables:
            db.execute(text(f"DELETE FROM {table}"))


def seed_users(db):
    users = [
        User(name="Ananya", email="ananya@gmail.com", password=hash_password("ananya123"), role="recruiter"),
        User(name="Fresh Recruiter", email="fresh.recruiter@demohr.com", password=hash_password("FreshRecruiter123"), role="recruiter"),
        User(name="Nikhil", email="nikhil@gmail.com", password=hash_password("nikhil123"), role="candidate"),
        User(name="Hitesh", email="hitesh@gmail.com", password=hash_password("hitesh123"), role="candidate"),
        User(name="Praveen", email="praveen@gmail.com", password=hash_password("praveen123"), role="candidate"),
        User(name="Admin", email="admin@gmail.com", password=hash_password("admin123"), role="admin"),
    ]
    db.add_all(users)
    db.flush()

    return {u.name: u for u in users}


def seed_jobs(db, users):
    recruiter = users["Ananya"]
    jobs = [
        Job(
            title="Frontend Engineer",
            description="Build and maintain employer portal experiences using React and TypeScript.",
            location="Bangalore",
            salary="12-18 LPA",
            job_type="full-time",
            required_skills=["React", "TypeScript", "REST APIs"],
            experience_required="2+ years",
            is_active=True,
            created_by=recruiter.id,
            department="Engineering",
            status="Active",
            application_count=0,
        ),
        Job(
            title="Backend Engineer",
            description="Build FastAPI services and maintain PostgreSQL data models.",
            location="Remote",
            salary="14-20 LPA",
            job_type="full-time",
            required_skills=["Python", "FastAPI", "PostgreSQL"],
            experience_required="2+ years",
            is_active=True,
            created_by=recruiter.id,
            department="Engineering",
            status="Active",
            application_count=0,
        ),
    ]
    db.add_all(jobs)
    db.flush()
    return jobs


def seed_trust(db, users):
    recruiter = users["Ananya"]
    db.add(
        CompanyVerification(
            recruiter_id=recruiter.id,
            company_name="Ananya Talent Pvt Ltd",
            company_domain="ananyahr.in",
            company_email="ananya@ananyahr.in",
            website_url="https://ananyahr.in",
            verification_level="verified",
            trust_score=72,
            domain_verified=True,
            domain_otp_verified=True,
            business_registration_verified=True,
            business_registry_id="GSTIN-DEMO-ANANYA-01",
            business_country="India",
            website_quality_score=9,
            office_proof_verified=True,
            employee_presence_score=8,
            last_assessed_at=datetime.utcnow(),
        )
    )
    db.add(
        RecruiterReputation(
            recruiter_id=recruiter.id,
            response_rate=87.0,
            hiring_success_rate=24.0,
            avg_response_hours=11.5,
        )
    )


def seed_profiles(db, users):
    profile_data = [
        ("Nikhil", "Frontend Developer", "Bangalore", 2.5, ["React", "TypeScript", "Redux"], 8.4),
        ("Hitesh", "Backend Developer", "Hyderabad", 3.2, ["Python", "FastAPI", "SQLAlchemy"], 8.7),
        ("Praveen", "Full Stack Developer", "Chennai", 2.8, ["React", "Node.js", "PostgreSQL"], 8.6),
    ]

    for name, role, location, exp, skills, cgpa in profile_data:
        user = users[name]
        profile = CandidateProfile(
            user_id=user.id,
            full_name=name,
            email=user.email,
            phone=f"+91-90000{user.id:04d}",
            current_location=location,
            city=location,
            state="",
            country="India",
            headline=role,
            bio=f"{name} is interested in {role} opportunities.",
            current_role=role,
            current_company="",
            total_experience_years=exp,
            highest_qualification="B.Tech",
            cgpa=cgpa,
            resume_url=f"https://example.com/resume/{name.lower()}.pdf",
            availability="30days",
            preferred_locations=["Bangalore", "Remote"],
            preferred_job_types=["full-time"],
            profile_completion_percentage=92,
        )
        db.add(profile)
        db.flush()

        for skill in skills:
            db.add(
                CandidateSkill(
                    profile_id=profile.id,
                    skill_name=skill,
                    category="technical",
                    proficiency_level="advanced",
                )
            )


def seed_applications_and_interviews(db, users, jobs):
    candidate_order = ["Nikhil", "Hitesh", "Praveen"]
    statuses = ["applied", "shortlisted", "interview"]

    applications = []
    for idx, name in enumerate(candidate_order):
        user = users[name]
        target_job = jobs[idx % len(jobs)]
        status = statuses[idx]
        app = Application(
            user_id=user.id,
            job_id=target_job.id,
            candidate_name=name,
            candidate_email=user.email,
            status=status,
            score=80 + idx * 5,
            notes=f"Initial screening for {name}",
            skills=["React", "FastAPI", "PostgreSQL"] if idx != 0 else ["React", "TypeScript", "Redux"],
            experience_years=2 + idx,
            avatar="".join([part[0] for part in name.split()]).upper()[:2],
            role=target_job.title,
            location="India",
            phone=f"+91-90000{user.id:04d}",
            cgpa=8.2 + idx * 0.2,
            resume_url=f"https://example.com/resume/{name.lower()}.pdf",
            status_history=[{"status": "applied", "date": datetime.utcnow().isoformat()}],
        )
        applications.append(app)
        target_job.application_count += 1

    db.add_all(applications)
    db.flush()

    interviewer = users["Ananya"]
    interview_app = applications[2]
    db.add(
        Interview(
            application_id=interview_app.id,
            candidate_name=interview_app.candidate_name,
            job_title=jobs[0].title,
            interviewer_id=interviewer.id,
            interviewer_name=interviewer.name,
            scheduled_at=datetime.utcnow() + timedelta(days=2),
            status="scheduled",
            interview_type="technical",
            mode="online",
            timezone="Asia/Kolkata",
            notes="System design + coding round",
            meeting_link="https://meet.highrr.local/interview",
            candidate_response_status="pending",
            candidate_preferred_slots=[],
            status_history=[{"status": "scheduled", "date": datetime.utcnow().isoformat()}],
        )
    )


def main():
    db = SessionLocal()
    try:
        clear_tables(db)
        users = seed_users(db)
        seed_trust(db, users)
        jobs = seed_jobs(db, users)
        seed_profiles(db, users)
        seed_applications_and_interviews(db, users, jobs)
        db.commit()
        print("Database reset and seed complete.")
        print("Recruiter login: ananya@gmail.com / ananya123")
        print("Unverified recruiter login: fresh.recruiter@demohr.com / FreshRecruiter123")
        print("Candidate logins: nikhil@gmail.com / nikhil123, hitesh@gmail.com / hitesh123, praveen@gmail.com / praveen123")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
