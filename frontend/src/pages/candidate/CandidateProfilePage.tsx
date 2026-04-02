import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Save } from "lucide-react";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

const CandidateProfilePage = () => {
  const { user, updateProfile } = useStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    bio: user.bio || "",
    skills: user.skills?.join(", ") || "",
    experience_years: user.experience_years || 0,
    cgpa: user.cgpa || 0,
  });

  const handleSave = () => {
    updateProfile({
      name: form.name,
      phone: form.phone,
      bio: form.bio,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      experience_years: form.experience_years,
      cgpa: form.cgpa,
    });
    setEditing(false);
    toast({ title: "Profile updated", description: "Your changes have been saved." });
  };

  return (
    <PageLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift">Edit Profile</button>
        ) : (
          <button onClick={handleSave} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-card">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">{user.avatar}</div>
            {editing ? (
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-4 text-xl font-bold text-center bg-muted rounded-xl px-4 py-2 text-sm outline-none w-full" />
            ) : (
              <h2 className="text-xl font-bold text-foreground mt-4">{user.name}</h2>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
              <Mail className="w-3.5 h-3.5" /> {user.email}
            </div>
            {(user.phone || editing) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Phone className="w-3.5 h-3.5" />
                {editing ? (
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-muted rounded-lg px-2 py-1 text-sm outline-none" placeholder="Phone" />
                ) : user.phone}
              </div>
            )}
            <div className="flex gap-4 mt-4 text-sm">
              <div className="text-center">
                <p className="font-bold text-foreground">{editing ? <input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: +e.target.value })} className="w-16 bg-muted rounded-lg px-2 py-1 text-sm outline-none text-center" /> : user.experience_years || 0}</p>
                <p className="text-xs text-muted-foreground">Years Exp</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground">{editing ? <input type="number" step="0.1" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: +e.target.value })} className="w-16 bg-muted rounded-lg px-2 py-1 text-sm outline-none text-center" /> : user.cgpa || "N/A"}</p>
                <p className="text-xs text-muted-foreground">CGPA</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-3">About</h3>
            {editing ? (
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none placeholder:text-muted-foreground" placeholder="Tell us about yourself..." />
            ) : (
              <p className="text-sm text-muted-foreground">{user.bio || "No bio added yet."}</p>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-3">Skills</h3>
            {editing ? (
              <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground" placeholder="React, TypeScript, Node.js..." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(user.skills || []).map((s) => <span key={s} className="px-3 py-1.5 bg-secondary text-accent-foreground rounded-lg text-sm font-medium">{s}</span>)}
              </div>
            )}
          </div>

          {user.projects && user.projects.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h3 className="text-lg font-semibold text-foreground mb-3">Projects</h3>
              <div className="space-y-3">
                {user.projects.map((p) => (
                  <div key={p.name} className="p-4 bg-muted rounded-xl">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.certifications && user.certifications.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h3 className="text-lg font-semibold text-foreground mb-3">Certifications</h3>
              <div className="flex flex-wrap gap-2">
                {user.certifications.map((c) => <span key={c} className="px-3 py-1.5 bg-muted rounded-lg text-sm text-muted-foreground font-medium">{c}</span>)}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </PageLayout>
  );
};

export default CandidateProfilePage;
