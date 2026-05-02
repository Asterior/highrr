from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import verify_access_token
from app.db.deps import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User

router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[int, dict[int, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: int, user_id: int) -> None:
        await websocket.accept()
        self.active_connections.setdefault(conversation_id, {})[user_id] = websocket

    def disconnect(self, conversation_id: int, user_id: int) -> None:
        connections = self.active_connections.get(conversation_id)
        if not connections:
            return

        connections.pop(user_id, None)
        if not connections:
            self.active_connections.pop(conversation_id, None)

    async def send_to_user(self, conversation_id: int, user_id: int, payload: dict) -> None:
        websocket = self.active_connections.get(conversation_id, {}).get(user_id)
        if websocket is None:
            return

        try:
            await websocket.send_json(payload)
        except Exception:
            self.disconnect(conversation_id, user_id)

    async def broadcast_to_conversation(self, conversation_id: int, payload: dict) -> None:
        connections = self.active_connections.get(conversation_id, {})
        for user_id, websocket in list(connections.items()):
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(conversation_id, user_id)

    def is_online(self, conversation_id: int, user_id: int) -> bool:
        return user_id in self.active_connections.get(conversation_id, {})


manager = ConnectionManager()


def _decode_user_id(token: str, db: Session) -> int | None:
    try:
        payload = verify_access_token(token)
    except JWTError:
        return None

    raw_user_id = payload.get("id") or payload.get("user_id")
    if raw_user_id is None:
        return None

    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user.id if user else None


def _get_conversation(db: Session, conversation_id: int) -> Conversation | None:
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()


def _other_participant_id(db: Session, conversation_id: int, user_id: int) -> int | None:
    conversation = _get_conversation(db, conversation_id)
    if not conversation:
        return None
    return conversation.participant_two_id if conversation.participant_one_id == user_id else conversation.participant_one_id


async def notify_message_sent(conversation_id: int, payload: dict) -> None:
    await manager.broadcast_to_conversation(conversation_id, {"type": "message", "message": payload})


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    user_id = _decode_user_id(token, db)
    if user_id is None:
        await websocket.accept()
        await websocket.send_json({"type": "error", "detail": "Invalid or expired token"})
        await websocket.close(code=4001)
        return

    conversation = _get_conversation(db, conversation_id)
    if not conversation or user_id not in {conversation.participant_one_id, conversation.participant_two_id}:
        await websocket.accept()
        await websocket.send_json({"type": "error", "detail": "Not a participant"})
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, conversation_id, user_id)
    other_id = _other_participant_id(db, conversation_id, user_id)

    if other_id is not None:
        await manager.send_to_user(conversation_id, other_id, {"type": "presence", "user_id": user_id, "online": True})

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "Invalid JSON"})
                continue

            message_type = data.get("type")

            if message_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if message_type == "typing":
                if other_id is not None:
                    await manager.send_to_user(
                        conversation_id,
                        other_id,
                        {"type": "typing", "user_id": user_id, "is_typing": bool(data.get("is_typing", False))},
                    )
                continue

            if message_type == "message":
                text = (data.get("text") or data.get("message") or "").strip()
                if not text:
                    await websocket.send_json({"type": "error", "detail": "Empty message"})
                    continue

                if other_id is None:
                    await websocket.send_json({"type": "error", "detail": "No other participant found"})
                    continue

                now = datetime.now(timezone.utc)
                message = Message(
                    conversation_id=conversation_id,
                    sender_id=user_id,
                    receiver_id=other_id,
                    message=text,
                    sent_at=now,
                    is_read=False,
                )
                db.add(message)

                conversation.last_message = text
                conversation.last_message_time = now
                db.commit()
                db.refresh(message)

                payload = {
                    "id": message.id,
                    "conversation_id": message.conversation_id,
                    "sender_id": message.sender_id,
                    "receiver_id": message.receiver_id,
                    "message": message.message,
                    "sent_at": _as_utc(message.sent_at).isoformat() if _as_utc(message.sent_at) else None,
                    "is_read": message.is_read,
                }
                await notify_message_sent(conversation_id, payload)
                continue

            await websocket.send_json({"type": "error", "detail": f"Unknown type: {message_type}"})
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, user_id)
        if other_id is not None:
            await manager.send_to_user(conversation_id, other_id, {"type": "presence", "user_id": user_id, "online": False})
