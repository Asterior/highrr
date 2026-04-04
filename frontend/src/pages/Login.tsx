import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { loginWithBackend, getMe } from "@/services/api";
import { useStore } from "@/stores/useStore";
import { CurrentUser } from "@/data/types";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { access_token } = await loginWithBackend(email, password);
      localStorage.setItem("token", access_token);

      const backendUser = await getMe(access_token);

      // Map backend user to CurrentUser shape
const user: CurrentUser = {
  id: String(backendUser.id),
  name: backendUser.name,
  email: backendUser.email,
  role: backendUser.role,
  avatar: "",
  company: "",
};

      login(user);

      toast({ title: `Welcome, ${user.name}!`, description: "Signed in successfully." });

      if (user.role === "candidate") navigate("/candidate");
      else navigate("/");
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Check your email and password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Highrr</h1>
          <p className="text-muted-foreground mt-2">Sign in to your hiring platform</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-elevated">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover-lift disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;