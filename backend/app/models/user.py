from sqlalchemy import Column, Integer, String
from app.db.base import Base

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Basic Info
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)

    # Auth
    password = Column(String, nullable=False)

    # Role-based access
    role = Column(String, nullable=False)  # admin / recruiter / interviewer

    # Status
    is_active = Column(Boolean, default=True)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)