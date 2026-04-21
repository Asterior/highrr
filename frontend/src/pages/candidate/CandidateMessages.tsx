// frontend/src/pages/candidate/CandidateMessages.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { Send, Search, AlertTriangle, Flag } from "lucide-react";
import { useStore } from "@/stores/useStore";
import { useChat } from "@/hooks/useChat";
import { reportUser } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const CandidateMessages = () => {
  const { user, conversations, loadConversations, loadMessages, sendMessage } = useStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportingMsgId, setReportingMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { if (selectedId) loadMessages(selectedId); }, [selectedId]);

  // Open conversation if navigated here with ?conversation=id
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conversation");
    if (convId) setSelectedId(convId);
  }, []);

  // FIX: auto-select first conversation if no URL param (mirrors Messages.tsx behaviour)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conversation");
    if (!convId && !selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations]);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv?.messages?.length]);

  const { status, isTyping, otherUserOnline, sendWsMessage, sendTyping } = useChat({
    conversationId: selectedId,
  });

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !selectedId) return;
    setInputText("");
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    // FIX: only send via REST — WebSocket is receive-only from our side
    // The WS backend will broadcast to the other participant
    await sendMessage(selectedId, text);
  }, [inputText, selectedId, sendMessage, sendTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (status === "connected") {
      sendTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleReport = async (msg: any) => {
    if (reportingMsgId === msg.id) return;
    setReportingMsgId(msg.id);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await reportUser(token, {
        recruiter_id: Number(msg.sender_id),
        category: "scam",
        details: `Flagged message: "${msg.message.slice(0, 200)}"`,
      });
      toast({ title: "Reported", description: "This message has been reported to our team." });
    } catch {
      toast({ title: "Error", description: "Failed to submit report.", variant: "destructive" });
    } finally {
      setReportingMsgId(null);
    }
  };

  const filtered = conversations.filter((c) =>
    c.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusDot = () => {
    if (status === "connected") return "bg-green-500";
    if (status === "connecting") return "bg-yellow-400 animate-pulse";
    return "bg-gray-400";
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] mt-16 bg-background">
      {/* ── Sidebar ── */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet</div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 ${selectedId === conv.id ? "bg-muted" : ""}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {conv.participant_avatar}
                  </div>
                  {selectedId === conv.id && otherUserOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{conv.participant_name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-1">{conv.last_message_time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message || "No messages yet"}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="flex-shrink-0 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Panel ── */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {selectedConv.participant_avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedConv.participant_name}</p>
                <p className="text-xs text-muted-foreground">
                  {isTyping ? "Typing…" : otherUserOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${statusDot()}`} />
              <span className="text-xs text-muted-foreground capitalize">{status}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
            {(selectedConv.messages ?? []).length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                No messages yet. Say hello!
              </div>
            ) : (
              (selectedConv.messages ?? []).map((msg: any) => {
                const isMine = String(msg.sender_id) === String(user.id);
                return (
                  <div key={msg.id} className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                    {msg.is_flagged && !isMine && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800 max-w-[70%]">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>This message may contain suspicious content.</span>
                        <button
                          onClick={() => handleReport(msg)}
                          disabled={reportingMsgId === msg.id}
                          className="ml-auto flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                        >
                          <Flag className="w-3 h-3" />
                          {reportingMsgId === msg.id ? "Reporting…" : "Report"}
                        </button>
                      </div>
                    )}
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                      {msg.message}
                      <span className={`block text-right text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Type a message…"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2.5 text-sm bg-muted rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Select a conversation to start chatting
        </div>
      )}
    </div>
  );
};

export default CandidateMessages;