import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { getMe, loginWithBackend, registerUser } from "@/services/api";
import { useStore } from "@/stores/useStore";
import { CurrentUser } from "@/data/types";

const RecruiterRegister = () => {
  const navigate = useNavigate();
  const { login } = useStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast({ title: "Missing fields", description: "Name, email and password are required.", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Password mismatch", description: "Confirm password must match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "recruiter",
      });

      const { access_token } = await loginWithBackend(form.email.trim().toLowerCase(), form.password);
      localStorage.setItem("token", access_token);
      const backendUser = await getMe(access_token);

      const user: CurrentUser = {
        id: backendUser.id,
        name: backendUser.name,
        email: backendUser.email,
        role: backendUser.role,
        avatar: "",
        company: "",
      };

      login(user);
      toast({ title: "Recruiter account created", description: "Complete company verification to unlock recruiter tools." });
      navigate("/verify-company", { replace: true });
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message || "Could not create recruiter account", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-cyan-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-card">
        <h1 className="text-2xl font-bold text-foreground">Register As Recruiter</h1>
        <p className="text-sm text-muted-foreground mt-1">Create your recruiter account first, then complete company verification.</p>

        <form onSubmit={onSubmit} className="space-y-3 mt-5">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Work email"
            className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none"
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Password"
            className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none"
          />
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Confirm password"
            className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none"
          />

          <button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
            {loading ? "Creating account..." : "Create Recruiter Account"}
          </button>
        </form>

        <button onClick={() => navigate("/login")} className="mt-3 text-sm text-violet-700 hover:underline">Back to login</button>
      </div>
    </div>
  );
};

export default RecruiterRegister;
