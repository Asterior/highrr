import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { askAssistant } from "@/services/api";

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
}

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", text: "Hi! I'm Highrr AI. I can help with ATS scans, hierarchy, interviews, jobs, and messaging workflows.", isBot: true },
  ]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const history = messages
      .filter((msg) => msg.id !== "1")
      .map((msg) => ({ role: msg.isBot ? "assistant" as const : "user" as const, text: msg.text }));

    const userMsg: ChatMessage = { id: Date.now().toString(), text: input, isBot: false };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await askAssistant(token, input.trim(), history);
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), text: data.reply || "I couldn't generate a response right now.", isBot: true };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Assistant is temporarily unavailable. Try asking about ATS score, hierarchy flow, interviews, or job creation.",
        isBot: true,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setSending(false);
    }

    setInput("");
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 w-80 h-[420px] bg-card rounded-2xl border border-border shadow-elevated z-50 flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gradient-primary rounded-t-2xl">
              <span className="text-sm font-semibold text-primary-foreground">Highrr AI</span>
              <button onClick={() => setOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${msg.isBot ? "bg-muted text-foreground rounded-bl-md" : "gradient-primary text-primary-foreground rounded-br-md"}`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !sending && handleSend()}
                  placeholder="Ask anything..."
                  className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button onClick={handleSend} disabled={!input.trim() || sending} className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-primary-foreground disabled:opacity-50">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 gradient-primary rounded-full shadow-hover flex items-center justify-center text-primary-foreground z-50 hover-lift"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    </>
  );
};

export default ChatBot;
