import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, get_db
from app.db.base import Base
from fastapi import Depends
from sqlalchemy.orm import Session
from app.models import user
from app.api.v1.endpoints import users
from app.api.v1.endpoints import auth
from app.models import job
from app.api.v1.endpoints import jobs
from app.models import application
from app.api.v1.endpoints import applications
from app.models import interview
from app.models import conversation
from app.models import message
from app.api.v1.endpoints import interviews
from app.api.v1.endpoints import messages
from app.api.v1.endpoints import analytics
from app.api.v1.endpoints import candidate_profile, file_upload


app = FastAPI()

default_origins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", ",".join(default_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(interviews.router, prefix="/interviews", tags=["Interviews"])
app.include_router(messages.router, tags=["Messages"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(candidate_profile.router)
app.include_router(file_upload.router)
@app.get("/")
def root():
    return {"message": "Highrr Employer Backend Running 🚀"}

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    return {"msg": "DB connected"}