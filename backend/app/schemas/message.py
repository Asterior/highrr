from datetime import datetime

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    participant_id: int


class ConversationResponse(BaseModel):
    id: int
    participant_one_id: int
    participant_two_id: int
    participant_id: int | None = None
    participant_name: str | None = None
    participant_role: str | None = None
    unread_count: int = 0
    created_at: datetime
    last_message: str | None
    last_message_time: datetime | None

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

    class Config:
        from_attributes = True
