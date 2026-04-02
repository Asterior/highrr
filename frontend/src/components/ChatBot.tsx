import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/stores/useStore";

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
}

const botResponses: Record<string, string> = {
  "best candidate": "Based on scores, your top candidate is the one with the highest match score. Check the Pipeline page for details!",
  "pipeline": "Your pipeline currently has candidates across all stages. Use the Pipeline page to drag and drop candidates between stages.",
  "interview": "You can schedule interviews from the Interviews page. Click 'Schedule Interview' to get started.",
  "job": "You can create new jobs from the Jobs page or go to /jobs/create for the full form.",
  "analytics": "Check the Analytics page for conversion funnels, drop-off rates, and time-to-hire metrics.",
  "help": "I can help with:\n• Finding best candidates\n• Pipeline stats\n• Interview scheduling\n• Job posting\n• Analytics insights\n\nJust ask!",
};

const getResponse = (input: string, state: ReturnType<typeof useStore.getState>): string => {
  const lower = input.toLowerCase();

  for (const [key, response] of Object.entries(botResponses)) {
    if (lower.includes(key)) return response;
  }

  if (lower.includes("stat") || lower.includes("number") || lower.includes("how many")) {
    const { jobs, applications, interviews } = state;
    return `Here are your current stats:\n• ${jobs.filter((j) => j.status === "Active").length} active jobs\n• ${applications.length} total candidates\n• ${interviews.filter((i) => i.status === "scheduled").length} upcoming interviews\n• ${applications.filter((a) => a.status === "selected").length} candidates selected`;
  }

  if (lower.includes("top") || lower.includes("best")) {
    const top = [...state.applications].sort((a, b) => b.score - a.score).slice(0, 3);
    return `Top candidates:\n${top.map((c, i) => `${i + 1}. ${c.candidate_name} (${c.score}% match) - ${c.role}`).join("\n")}`;
  }

  return "I'm Highrr's AI assistant. Try asking about your best candidates, pipeline stats, interviews, or type 'help' for all options.";
};

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", text: "Hi! I'm Highrr AI. How can I help you today? Type 'help' to see what I can do.", isBot: true },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), text: input, isBot: false };
    const state = useStore.getState();
    const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), text: getResponse(input, state), isBot: true };
    setMessages((prev) => [...prev, userMsg, botMsg]);
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
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask anything..."
                  className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button onClick={handleSend} disabled={!input.trim()} className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-primary-foreground disabled:opacity-50">
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
