# backend/app/api/v1/endpoints/websocket.py

from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
import json
from datetime import datetime

from jose import JWTError, jwt

from app.db.deps import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User

# must match security.py exactly
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

router = APIRouter()


# ── Connection Manager ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = {}
        self.active_connections[conversation_id][user_id] = websocket

    def disconnect(self, conversation_id: int, user_id: int):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].pop(user_id, None)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast_to_conversation(self, conversation_id: int, payload: dict):
        connections = self.active_connections.get(conversation_id, {})
        for uid, ws in list(connections.items()):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(conversation_id, uid)

    async def send_to_user(self, conversation_id: int, user_id: int, payload: dict):
        ws = self.active_connections.get(conversation_id, {}).get(user_id)
        if ws:
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(conversation_id, user_id)

    def is_online(self, conversation_id: int, user_id: int) -> bool:
        return user_id in self.active_connections.get(conversation_id, {})


manager = ConnectionManager()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_id_from_token(token: str, db: Session) -> int | None:
    """Decode JWT using same SECRET_KEY/ALGORITHM as security.py, return user_id."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # auth.py stores user id under "id", email under "sub"
        user_id = payload.get("id")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user.id if user else None
    except (JWTError, ValueError, Exception):
        return None


def _user_in_conversation(db: Session, conversation_id: int, user_id: int) -> bool:
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        return False
    return user_id in (conv.participant_one_id, conv.participant_two_id)


def _other_participant_id(db: Session, conversation_id: int, user_id: int) -> int | None:
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        return None
    return conv.participant_two_id if conv.participant_one_id == user_id else conv.participant_one_id


# ── WebSocket Route ───────────────────────────────────────────────────────────

@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    # ── 1. Authenticate ───────────────────────────────────────────
    user_id = _get_user_id_from_token(token, db)
    if user_id is None:
        await websocket.accept()
        await websocket.send_json({"type": "error", "detail": "Invalid or expired token"})
        await websocket.close(code=4001)
        return

    # ── 2. Authorise ──────────────────────────────────────────────
    if not _user_in_conversation(db, conversation_id, user_id):
        await websocket.accept()
        await websocket.send_json({"type": "error", "detail": "Not a participant"})
        await websocket.close(code=4003)
        return

    # ── 3. Connect ────────────────────────────────────────────────
    await manager.connect(websocket, conversation_id, user_id)
    other_id = _other_participant_id(db, conversation_id, user_id)

    if other_id:
        await manager.send_to_user(
            conversation_id, other_id,
            {"type": "presence", "user_id": user_id, "online": True}
        )

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "Invalid JSON"})
                continue

            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type == "typing":
                if other_id:
                    await manager.send_to_user(
                        conversation_id, other_id,
                        {"type": "typing", "user_id": user_id, "is_typing": bool(data.get("is_typing", False))}
                    )
                continue

            if msg_type == "message":
                text = (data.get("text") or "").strip()
                if not text:
                    await websocket.send_json({"type": "error", "detail": "Empty message"})
                    continue

                if other_id is None:
                    await websocket.send_json({"type": "error", "detail": "No other participant found"})
                    continue

                now = datetime.utcnow()
                db_msg = Message(
                    conversation_id=conversation_id,
                    sender_id=user_id,
                    receiver_id=other_id,
                    message=text,
                    sent_at=now,
                    is_read=False,
                )
                db.add(db_msg)

                conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                if conv:
                    conv.last_message = text
                    conv.last_message_time = now

                db.commit()
                db.refresh(db_msg)

                if manager.is_online(conversation_id, other_id):
                    db_msg.is_read = True
                    db.commit()

                payload = {
                    "type": "message",
                    "message": {
                        "id": db_msg.id,
                        "conversation_id": db_msg.conversation_id,
                        "sender_id": db_msg.sender_id,
                        "receiver_id": db_msg.receiver_id,
                        "message": db_msg.message,
                        "sent_at": db_msg.sent_at.isoformat(),
                        "is_read": db_msg.is_read,
                        "is_flagged": False,
                    },
                }

                await manager.broadcast_to_conversation(conversation_id, payload)
                continue

            await websocket.send_json({"type": "error", "detail": f"Unknown type: {msg_type}"})

    except WebSocketDisconnect:
        manager.disconnect(conversation_id, user_id)
        if other_id:
            await manager.send_to_user(
                conversation_id, other_id,
                {"type": "presence", "user_id": user_id, "online": False}
            )