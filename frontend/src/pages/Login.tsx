import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { loginWithBackend, getMe } from "@/services/api";
import { useStore } from "@/stores/useStore";
import { CurrentUser } from "@/data/types";
import { Briefcase, CheckCircle, TrendingUp } from "lucide-react";

const floatingCards = [
  {
    icon: <Briefcase className="w-4 h-4 text-violet-500" />,
    iconBg: "#ede9fe",
    title: "Full Stack Developer",
    sub: "TechCorp • ₹18-24 LPA",
    tag: "New",
    tagBg: "#e0f2fe",
    tagColor: "#0369a1",
    delay: 0,
  },
  {
    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    iconBg: "#d1fae5",
    title: "Priya Sharma",
    sub: "Shortlisted for Interview",
    tag: "✓ Matched",
    tagBg: "#d1fae5",
    tagColor: "#065f46",
    delay: 0.15,
  },
  {
    icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
    iconBg: "#d1fae5",
    title: "ATS Score",
    sub: "Resume matched 91%",
    tag: "91%",
    tagBg: "#d1fae5",
    tagColor: "#065f46",
    delay: 0.3,
  },
];

const Login = () => {
  const navigate = useNavigate();
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

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
    <div className="min-h-screen flex" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex flex-col w-[52%] relative overflow-hidden px-14 py-12"
        style={{ background: "#eceef8" }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
          }}
        />

        {/* Soft blobs */}
        <div
          className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #a5b4fc, transparent)" }}
        />
        <div
          className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #6ee7b7, transparent)" }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <img src="/highrrlogo.png" alt="Highrr" className="h-8 w-auto" />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="relative z-10 mt-16"
        >
          <h1
            className="text-[2.6rem] font-extrabold leading-tight"
            style={{ color: "#1a1f36", letterSpacing: "-1px" }}
          >
            The Platform of Highrr
            <br />
            for Smart Hiring
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "#6b7280", maxWidth: "360px" }}>
            Post jobs, discover top talent, track your application pipeline, and conduct interviews — all in one unified workspace.
          </p>
        </motion.div>

        {/* Floating cards */}
        <div className="relative z-10 mt-10 flex flex-col gap-3" style={{ maxWidth: "340px" }}>
          {floatingCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35 + card.delay }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: "white",
                boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
                border: "1px solid rgba(255,255,255,0.9)",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: card.iconBg }}
              >
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "#1a1f36" }}>
                  {card.title}
                </p>
                <p className="text-xs truncate" style={{ color: "#9ca3af" }}>
                  {card.sub}
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: card.tagBg, color: card.tagColor }}
              >
                {card.tag}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Feature tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="relative z-10 mt-8 flex flex-wrap gap-2"
        >
          {["AI Resume Matching", "Pipeline Tracking", "Interview Scheduling", "ATS Score"].map((f) => (
            <span
              key={f}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(99,102,241,0.2)",
                color: "#4f46e5",
              }}
            >
              {f}
            </span>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="relative z-10 mt-auto pt-8 flex gap-10 border-t"
          style={{ borderColor: "rgba(99,102,241,0.12)" }}
        >
          {[
            { v: "50K+", l: "Jobs Posted" },
            { v: "2L+", l: "Candidates" },
            { v: "98%", l: "Placement Rate" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-2xl font-extrabold" style={{ color: "#4338ca" }}>{s.v}</p>
              <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{s.l}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-between py-12 px-8 bg-white">

        {/* Top logo — centered like screenshot */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <img src="/highrrlogo.png" alt="Highrr" className="h-10 w-auto" />
        </motion.div>

        {/* Form area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm"
        >
          <h2 className="text-4xl font-bold mb-2" style={{ color: "#111827", letterSpacing: "-0.5px" }}>
            Log in or Sign up
          </h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "#6b7280" }}>
            Access your workspace to post jobs, manage candidates, and track your hiring pipeline.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              onFocus={() => setEmailFocus(true)}
              onBlur={() => setEmailFocus(false)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                border: `1.5px solid ${emailFocus ? "#6366f1" : "#e5e7eb"}`,
                background: "#f9fafb",
                color: "#111827",
              }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              onFocus={() => setPassFocus(true)}
              onBlur={() => setPassFocus(false)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                border: `1.5px solid ${passFocus ? "#6366f1" : "#e5e7eb"}`,
                background: "#f9fafb",
                color: "#111827",
              }}
            />

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{
                background: "#4b5563",
                boxShadow: "0 2px 12px rgba(75,85,99,0.25)",
              }}
            >
              {loading ? "Signing in..." : "Continue"}
            </motion.button>
          </form>

          <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: "#f3f4f6" }}>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Don't have an account?{" "}
              <span
                className="font-semibold cursor-pointer"
                style={{ color: "#4f46e5" }}
                onClick={() => toast({ title: "Contact your admin to create an account." })}
              >
                Register as a Student
              </span>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="flex gap-6 text-xs" style={{ color: "#d1d5db" }}>
          <span className="cursor-pointer hover:text-gray-400 transition-colors">Privacy Policy</span>
          <span className="cursor-pointer hover:text-gray-400 transition-colors">Terms & Conditions</span>
          <span>Copyright © 2026</span>
        </div>
      </div>
    </div>
  );
};

export default Login;