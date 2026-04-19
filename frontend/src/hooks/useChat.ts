// frontend/src/hooks/useChat.ts

import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/stores/useStore";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseChatOptions {
  conversationId: string | null;
  onNewMessage?: () => void;
}

interface UseChatReturn {
  status: ConnectionStatus;
  isTyping: boolean;
  otherUserOnline: boolean;
  sendWsMessage: (text: string) => void;
  sendTyping: (isTyping: boolean) => void;
}

const WS_BASE =
  import.meta.env.VITE_WS_BASE_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8000`;

const PING_INTERVAL_MS = 25_000;
const TYPING_DEBOUNCE_MS = 2_000;

export function useChat({ conversationId, onNewMessage }: UseChatOptions): UseChatReturn {
  const userId = useStore((s) => s.user.id);
  const appendIncomingMessage = useStore((s) => s.appendIncomingMessage);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const isMounted = useRef(true);

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);

  const clearPing = () => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
  };
  const clearTypingTimeout = () => {
    if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
  };
  const clearReconnect = () => {
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
  };
  const closeSocket = () => {
    clearPing();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connect = useCallback(
    (convId: string) => {
      const token = localStorage.getItem("token");
      if (!token) { setStatus("error"); return; }

      closeSocket();
      setStatus("connecting");

      const ws = new WebSocket(`${WS_BASE}/ws/chat/${convId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) return;
        setStatus("connected");
        reconnectAttempts.current = 0;
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        if (!isMounted.current) return;
        let data: any;
        try { data = JSON.parse(event.data); } catch { return; }

        switch (data.type) {
          case "message": {
            const msg = data.message;
            if (!msg) break;
            // Only append messages FROM the other person —
            // own messages are already appended optimistically by sendMessage in the store
            if (String(msg.sender_id) !== String(userId)) {
              appendIncomingMessage(convId, msg);
              onNewMessage?.();
            }
            break;
          }
          case "typing": {
            if (String(data.user_id) !== String(userId)) {
              setIsTyping(Boolean(data.is_typing));
              clearTypingTimeout();
              if (data.is_typing) {
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), TYPING_DEBOUNCE_MS);
              }
            }
            break;
          }
          case "presence": {
            if (String(data.user_id) !== String(userId)) {
              setOtherUserOnline(Boolean(data.online));
            }
            break;
          }
          case "pong": break;
          case "error": console.warn("[useChat] server error:", data.detail); break;
          default: break;
        }
      };

      ws.onerror = () => { if (isMounted.current) setStatus("error"); };

      ws.onclose = (event) => {
        if (!isMounted.current) return;
        clearPing();
        setStatus("disconnected");
        setIsTyping(false);
        setOtherUserOnline(false);
        if (event.code === 4001 || event.code === 4003) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30_000);
        reconnectAttempts.current += 1;
        reconnectRef.current = setTimeout(() => {
          if (isMounted.current && convId) connect(convId);
        }, delay);
      };
    },
    [userId, appendIncomingMessage, onNewMessage]
  );

  useEffect(() => {
    isMounted.current = true;
    if (!conversationId) {
      closeSocket();
      clearReconnect();
      setStatus("disconnected");
      return;
    }
    connect(conversationId);
    return () => {
      isMounted.current = false;
      clearReconnect();
      closeSocket();
      clearTypingTimeout();
    };
  }, [conversationId]);

  const sendWsMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[useChat] WebSocket not open");
      return;
    }
    wsRef.current.send(JSON.stringify({ type: "message", text }));
  }, []);

  const sendTyping = useCallback((typing: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "typing", is_typing: typing }));
  }, []);

  return { status, isTyping, otherUserOnline, sendWsMessage, sendTyping };
}