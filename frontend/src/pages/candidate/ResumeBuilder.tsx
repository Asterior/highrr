import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

const ResumeBuilder = () => {
  const { user } = useStore();
  const [form, setForm] = useState({
    summary: user.bio || "",
    skills: user.skills?.join(", ") || "",
    experience: "Sr. Frontend Engineer at TechCorp (2020-Present)\n- Built scalable React applications\n- Led team of 4 developers",
    education: "B.Tech Computer Science, IIT Delhi (2016-2020)\nCGPA: " + (user.cgpa || "8.5"),
    certifications: user.certifications?.join("\n") || "",
  });

  useEffect(() => {
    setForm({
      summary: user.bio || "",
      skills: user.skills?.join(", ") || "",
      experience: "Sr. Frontend Engineer at TechCorp (2020-Present)\n- Built scalable React applications\n- Led team of 4 developers",
      education: "B.Tech Computer Science, IIT Delhi (2016-2020)\nCGPA: " + (user.cgpa || "8.5"),
      certifications: user.certifications?.join("\n") || "",
    });
  }, [user]);

  const handleDownload = () => {
    const resume = `
${user.name}
${user.email}${user.phone ? ` | ${user.phone}` : ""}

SUMMARY
${form.summary}

SKILLS
${form.skills}

EXPERIENCE
${form.experience}

EDUCATION
${form.education}

CERTIFICATIONS
${form.certifications}
    `.trim();

    const blob = new Blob([resume], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${user.name.replace(/\s+/g, "_")}_Resume.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Resume downloaded", description: "Your resume file has been saved." });
  };

  return (
    <PageLayout>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resume Builder</h1>
          <p className="text-muted-foreground mt-1">Build your resume content here. Upload and ATS scan now live on the ATS Score page.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/candidate/profile" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-card hover-lift">
            <UserCircle2 className="w-4 h-4" /> Profile
          </Link>
          <button onClick={handleDownload} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover-lift">
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-5">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-white via-violet-50/35 to-white p-6 shadow-card">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-700" />
            <h2 className="text-lg font-semibold text-foreground">Resume content</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Keep the profile details editable in your profile page, then use this page to shape the actual resume content that gets exported.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Professional Summary</h2>
          <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" placeholder="Brief professional summary..." />
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Skills</h2>
          <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" placeholder="Comma-separated skills..." />
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Experience</h2>
          <textarea value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} rows={5} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" placeholder="Job title, company, dates, responsibilities..." />
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Education</h2>
          <textarea value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} rows={3} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" placeholder="Degree, institution, year..." />
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Certifications</h2>
          <textarea value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} rows={3} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" placeholder="One certification per line..." />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground flex items-center gap-2">
          <UserCircle2 className="w-4 h-4" /> Personal profile details live on the profile page now, not here.
        </div>
      </motion.div>
    </PageLayout>
  );
};

export default ResumeBuilder;
