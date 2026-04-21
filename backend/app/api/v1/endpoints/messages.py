# backend/app/api/v1/endpoints/messages.py
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
    convs = (
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

    result = []
    for conv in convs:
        peer_id = (
            conv.participant_two_id
            if conv.participant_one_id == current_user.id
            else conv.participant_one_id
        )
        peer = db.query(User).filter(User.id == peer_id).first()
        peer_name = peer.name if peer else "Unknown"
        parts = peer_name.split()
        avatar = (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else peer_name[:2].upper()

        unread = (
            db.query(Message)
            .filter(
                Message.conversation_id == conv.id,
                Message.receiver_id == current_user.id,
                Message.is_read == False,
            )
            .count()
        )

        enriched = ConversationResponse(
            id=conv.id,
            participant_one_id=conv.participant_one_id,
            participant_two_id=conv.participant_two_id,
            created_at=conv.created_at,
            last_message=conv.last_message,
            last_message_time=conv.last_message_time,
            participant_id=peer_id,
            participant_name=peer_name,
            participant_avatar=avatar,
            unread_count=unread,
        )
        result.append(enriched)

    return result


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

    def _enrich(conv):
        peer_name = other_user.name if other_user else "Unknown"
        parts = peer_name.split()
        avatar = (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else peer_name[:2].upper()
        unread = (
            db.query(Message)
            .filter(
                Message.conversation_id == conv.id,
                Message.receiver_id == current_user.id,
                Message.is_read == False,
            )
            .count()
        )
        return ConversationResponse(
            id=conv.id,
            participant_one_id=conv.participant_one_id,
            participant_two_id=conv.participant_two_id,
            created_at=conv.created_at,
            last_message=conv.last_message,
            last_message_time=conv.last_message_time,
            participant_id=other_user.id,
            participant_name=peer_name,
            participant_avatar=avatar,
            unread_count=unread,
        )

    if existing:
        return _enrich(existing)

    conv = Conversation(
        participant_one_id=current_user.id,
        participant_two_id=payload.participant_id,
    )

    db.add(conv)
    db.commit()
    db.refresh(conv)
    return _enrich(conv)


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

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.sent_at.asc())
        .all()
    )

    # Mark all unread messages addressed to current user as read
    for msg in messages:
        if msg.receiver_id == current_user.id and not msg.is_read:
            msg.is_read = True
    db.commit()

    return messages


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
        is_flagged=suspicious,
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


@router.get("/messages/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    count = (
        db.query(Message)
        .filter(
            Message.receiver_id == current_user.id,
            Message.is_read == False,
        )
        .count()
    )
    return {"unread_count": count}


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