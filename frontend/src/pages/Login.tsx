import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = login(email, password);
      if (success) {
        toast({ title: "Welcome back!", description: "You've been signed in successfully." });
        // Route based on role
        const user = useStore.getState().user;
        if (user.role === "candidate") {
          navigate("/candidate");
        } else {
          navigate("/");
        }
      }
      setLoading(false);
    }, 800);
  };

  const quickLogin = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Highrr</h1>
          <p className="text-muted-foreground mt-2">Sign in to your hiring platform</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-elevated">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
            <button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover-lift disabled:opacity-50">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">Quick login as:</p>
            <div className="flex gap-2">
              <button onClick={() => quickLogin("rajesh@highrr.com", "admin123")} className="flex-1 px-3 py-2 bg-muted rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                👨‍💼 Recruiter
              </button>
              <button onClick={() => quickLogin("priya@gmail.com", "candidate123")} className="flex-1 px-3 py-2 bg-muted rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                👨‍🎓 Candidate
              </button>
              <button onClick={() => quickLogin("admin@highrr.com", "admin123")} className="flex-1 px-3 py-2 bg-muted rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                🔑 Admin
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
