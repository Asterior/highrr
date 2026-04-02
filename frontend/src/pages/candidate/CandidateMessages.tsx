import { useState, useRef, useEffect } from "react";
import { Send, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import PageLayout from "@/components/PageLayout";

const CandidateMessages = () => {
  const { conversations, sendMessage, user } = useStore();
  // For candidates, show conversations where they are a participant
  const myConversations = conversations.filter((c) => c.participant_id === user.id || c.messages.some((m) => m.sender_id === user.id || m.receiver_id === user.id));

  const [activeChatId, setActiveChatId] = useState(myConversations[0]?.id || "");
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = myConversations.find((c) => c.id === activeChatId);
  const filteredConvs = myConversations.filter((c) => c.participant_name.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length]);

  const handleSend = () => {
    if (!newMessage.trim() || !activeChatId) return;
    sendMessage(activeChatId, newMessage.trim());
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <PageLayout>
      <h1 className="text-3xl font-bold text-foreground mb-6">Messages</h1>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        <div className="flex h-full">
          <div className="w-80 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConvs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
              )}
              {filteredConvs.map((c) => (
                <button key={c.id} onClick={() => setActiveChatId(c.id)} className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${activeChatId === c.id ? "bg-secondary" : "hover:bg-muted"}`}>
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold flex-shrink-0">{c.participant_avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.participant_name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {activeConv ? (
              <>
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">{activeConv.participant_avatar}</div>
                  <p className="font-semibold text-foreground">{activeConv.participant_name}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {activeConv.messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
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
                    <button onClick={handleSend} disabled={!newMessage.trim()} className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-primary-foreground hover-lift disabled:opacity-50">
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

export default CandidateMessages;
