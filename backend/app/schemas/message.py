# backend/app/schemas/message.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    participant_id: int


class ConversationResponse(BaseModel):
    id: int
    participant_one_id: int
    participant_two_id: int
    created_at: datetime
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None

    # These must match exactly what the endpoint sets on this object
    participant_id: Optional[int] = None
    participant_name: Optional[str] = None
    participant_avatar: Optional[str] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    receiver_id: int
    message: str


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    receiver_id: int
    message: str
    sent_at: datetime
    is_read: bool
    is_flagged: bool = False

    class Config:
        from_attributes = True