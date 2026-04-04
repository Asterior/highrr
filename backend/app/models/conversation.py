from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.db.base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    participant_one_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    participant_two_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_message = Column(String, nullable=True)
    last_message_time = Column(DateTime, nullable=True)
