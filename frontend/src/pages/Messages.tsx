import { useState, useRef, useEffect } from "react";
import { Send, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import PageLayout from "@/components/PageLayout";
import { useChat } from "@/hooks/useChat";
import {
  getConversationMessages,
  getConversations,
  sendConversationMessage,
  startConversation,
  markMessageAsRead,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

interface ConversationItem {
  id: number;
  participant_id: number;
  participant_name: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  sent_at: string;
  is_read: boolean;
}

const Messages = () => {
  const { user } = useStore();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newParticipantId, setNewParticipantId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("token") || "";
  const activeConv = conversations.find((c) => String(c.id) === activeChatId);
  const { status, isTyping, otherUserOnline, sendWsMessage } = useChat({
    conversationId: activeChatId || null,
    onNewMessage: async () => {
      if (!activeChatId) return;
      await Promise.all([loadMessages(activeChatId), loadConversations()]);
    },
  });

  const filteredConvs = conversations.filter((c) =>
    c.participant_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadConversations = async () => {
    if (!token) return;
    const data = await getConversations(token);
    setConversations(data);
    if (!activeChatId && data.length > 0) {
      setActiveChatId(String(data[0].id));
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (!token || !conversationId) return;
    const data = await getConversationMessages(token, conversationId);
    setMessages(data);

    const unread = data.filter((m: ChatMessage) => m.receiver_id === Number(user.id) && !m.is_read);
    for (const msg of unread) {
      try {
        await markMessageAsRead(token, msg.id);
      } catch {
        // Non-blocking.
      }
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        await loadConversations();

        const candidateId = searchParams.get("candidateId");
        if (candidateId && token) {
          const conv = await startConversation(token, Number(candidateId));
          await loadConversations();
          setActiveChatId(String(conv.id));
        }
      } catch (error: any) {
        toast({ title: "Failed to load conversations", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeChatId) return;
    loadMessages(activeChatId).catch((error: any) => {
      toast({ title: "Failed to load messages", description: error.message, variant: "destructive" });
    });
  }, [activeChatId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeChatId && filteredConvs.length > 0) {
      setActiveChatId(String(filteredConvs[0].id));
    }
    if (activeChatId && !filteredConvs.some((c) => String(c.id) === activeChatId) && filteredConvs.length > 0) {
      setActiveChatId(String(filteredConvs[0].id));
    }
  }, [activeChatId, filteredConvs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChatId) return;

    try {
      setSending(true);
      const sentViaSocket = sendWsMessage(newMessage.trim());
      if (!sentViaSocket) {
        await sendConversationMessage(token, activeChatId, {
          receiver_id: activeConv?.participant_id || 0,
          message: newMessage.trim(),
        });
      }
      setNewMessage("");
      await loadMessages(activeChatId);
      await loadConversations();
    } catch (error: any) {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartConversation = async () => {
    if (!token) return;
    const participantId = Number(newParticipantId);
    if (!participantId || Number.isNaN(participantId)) {
      toast({ title: "Invalid user id", description: "Enter a valid participant user id.", variant: "destructive" });
      return;
    }

    try {
      const conv = await startConversation(token, participantId);
      await loadConversations();
      setActiveChatId(String(conv.id));
      setNewParticipantId("");
      toast({ title: "Conversation created", description: "You can now message this user." });
    } catch (error: any) {
      toast({ title: "Unable to start conversation", description: error.message, variant: "destructive" });
    }
  };

  return (
    <PageLayout>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">{status === "connected" ? "Live websocket sync is active." : "Websocket reconnecting, REST fallback is available."}</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${status === "connected" ? "bg-emerald-50 text-emerald-700" : status === "connecting" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
          <span className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-500" : "bg-slate-400"}`} />
          {status}
        </span>
      </div>

      {loading && (
        <div className="mb-4 text-sm text-muted-foreground">Loading conversations...</div>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        <div className="flex h-full">
          <div className="w-80 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Search messages..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  value={newParticipantId}
                  onChange={(e) => setNewParticipantId(e.target.value)}
                  placeholder="User ID to start chat"
                  className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none"
                />
                <button onClick={handleStartConversation} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                  Start
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConvs.length === 0 && (
                <div className="h-full flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  No conversations matched your search.
                </div>
              )}
              {filteredConvs.map((c) => (
                <button key={c.id} onClick={() => setActiveChatId(String(c.id))} className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${activeChatId === String(c.id) ? "bg-secondary" : "hover:bg-muted"}`}>
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold flex-shrink-0">{(c.participant_name || "U").charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{c.participant_name}</p>
                      <span className="text-xs text-muted-foreground">{c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message || "No messages yet"}</p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold">{c.unread_count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {activeConv ? (
              <>
                <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">{(activeConv.participant_name || "U").charAt(0).toUpperCase()}</div>
                    <p className="font-semibold text-foreground">{activeConv.participant_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{isTyping ? "Typing…" : otherUserOnline ? "Online" : "Offline"}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg) => {
                    const isMe = String(msg.sender_id) === String(user.id);
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "gradient-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                          <p>{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
                    <button onClick={handleSend} disabled={!newMessage.trim() || sending} className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-primary-foreground hover-lift disabled:opacity-50">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a conversation</div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Messages;
