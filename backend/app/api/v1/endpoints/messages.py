from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user_report import UserReport
from app.models.user import User
from app.schemas.message import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)

router = APIRouter()

SUSPICIOUS_KEYWORDS = [
    "pay",
    "payment",
    "processing fee",
    "registration fee",
    "upi",
    "bank transfer",
    "telegram",
    "whatsapp",
    "dm me",
    "contact me on",
]


def _is_suspicious_message(content: str) -> bool:
    lowered = content.lower()
    return any(keyword in lowered for keyword in SUSPICIOUS_KEYWORDS)


@router.get("/conversations/", response_model=list[ConversationResponse])
def get_my_conversations(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return (
        db.query(Conversation)
        .filter(
            or_(
                Conversation.participant_one_id == current_user.id,
                Conversation.participant_two_id == current_user.id,
            )
        )
        .order_by(Conversation.last_message_time.desc())
        .all()
    )


@router.post("/conversations/", response_model=ConversationResponse)
def start_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    other_user = db.query(User).filter(User.id == payload.participant_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="Participant not found")

    if payload.participant_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start a conversation with yourself")

    existing = (
        db.query(Conversation)
        .filter(
            or_(
                and_(
                    Conversation.participant_one_id == current_user.id,
                    Conversation.participant_two_id == payload.participant_id,
                ),
                and_(
                    Conversation.participant_one_id == payload.participant_id,
                    Conversation.participant_two_id == current_user.id,
                ),
            )
        )
        .first()
    )

    if existing:
        return existing

    conv = Conversation(
        participant_one_id=current_user.id,
        participant_two_id=payload.participant_id,
    )

    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.id not in [conv.participant_one_id, conv.participant_two_id]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.sent_at.asc())
        .all()
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.id not in [conv.participant_one_id, conv.participant_two_id]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if payload.receiver_id not in [conv.participant_one_id, conv.participant_two_id]:
        raise HTTPException(status_code=400, detail="Receiver does not belong to conversation")

    sender = db.query(User).filter(User.id == current_user.id).first()
    receiver = db.query(User).filter(User.id == payload.receiver_id).first()
    if not sender or not receiver:
        raise HTTPException(status_code=404, detail="Sender or receiver not found")

    suspicious = _is_suspicious_message(payload.message)

    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        message=payload.message,
    )

    conv.last_message = payload.message
    conv.last_message_time = datetime.utcnow()

    db.add(msg)

    if suspicious and sender.role in {"recruiter", "admin"} and receiver.role == "candidate":
        db.add(
            UserReport(
                reporter_id=receiver.id,
                recruiter_id=sender.id,
                category="scam",
                details=f"Auto-flagged suspicious recruiter message: {payload.message[:180]}",
            )
        )

    db.commit()
    db.refresh(msg)
    return msg


@router.put("/messages/{message_id}/read")
def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    msg.is_read = True
    db.commit()

    return {"message": "Marked as read"}
