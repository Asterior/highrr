import { useCallback, useEffect, useRef, useState } from "react";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseChatOptions {
  conversationId: string | null;
  onNewMessage?: () => void;
}

interface UseChatReturn {
  status: ConnectionStatus;
  isTyping: boolean;
  otherUserOnline: boolean;
  sendWsMessage: (text: string) => boolean;
  sendTyping: (typing: boolean) => boolean;
}

const DEFAULT_WS_BASE = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8000`;
const WS_BASE = import.meta.env.VITE_WS_BASE_URL || DEFAULT_WS_BASE;

export function useChat({ conversationId, onNewMessage }: UseChatOptions): UseChatReturn {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const onNewMessageRef = useRef(onNewMessage);
  const mountedRef = useRef(false);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const clearPing = () => {
    if (pingRef.current) {
      clearInterval(pingRef.current);
      pingRef.current = null;
    }
  };

  const clearReconnect = () => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  };

  const clearTypingTimeout = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const closeSocket = () => {
    clearPing();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connect = useCallback((convId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatus("error");
      return;
    }

    clearReconnect();
    closeSocket();
    setStatus("connecting");

    const socket = new WebSocket(`${WS_BASE}/ws/chat/${convId}?token=${encodeURIComponent(token)}`);
    wsRef.current = socket;

    socket.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
      reconnectAttempts.current = 0;
      pingRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    };

    socket.onmessage = (event) => {
      if (!mountedRef.current) return;

      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "message") {
        onNewMessageRef.current?.();
        return;
      }

      if (data.type === "typing") {
        setIsTyping(Boolean(data.is_typing));
        clearTypingTimeout();
        if (data.is_typing) {
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
        }
        return;
      }

      if (data.type === "presence") {
        setOtherUserOnline(Boolean(data.online));
        return;
      }

      if (data.type === "error") {
        setStatus("error");
      }
    };

    socket.onerror = () => {
      if (mountedRef.current) {
        setStatus("error");
      }
    };

    socket.onclose = (event) => {
      if (!mountedRef.current) return;

      clearPing();
      setStatus("disconnected");
      setIsTyping(false);
      setOtherUserOnline(false);

      if (event.code === 4001 || event.code === 4003) {
        return;
      }

      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
      reconnectAttempts.current += 1;
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current && convId) {
          connect(convId);
        }
      }, delay);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!conversationId) {
      closeSocket();
      clearReconnect();
      setStatus("disconnected");
      setIsTyping(false);
      setOtherUserOnline(false);
      return () => {
        mountedRef.current = false;
      };
    }

    connect(conversationId);

    return () => {
      mountedRef.current = false;
      clearReconnect();
      clearTypingTimeout();
      closeSocket();
    };
  }, [conversationId, connect]);

  const sendWsMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    wsRef.current.send(JSON.stringify({ type: "message", text }));
    return true;
  }, []);

  const sendTyping = useCallback((typing: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    wsRef.current.send(JSON.stringify({ type: "typing", is_typing: typing }));
    return true;
  }, []);

  return { status, isTyping, otherUserOnline, sendWsMessage, sendTyping };
}
