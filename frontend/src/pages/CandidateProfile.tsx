import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import PageLayout from "@/components/PageLayout";

const skillEvals = [
  { name: "System Architecture", score: 92 },
  { name: "Algorithmic Efficiency", score: 88 },
  { name: "Code Quality", score: 95 },
  { name: "Communication", score: 85 },
];

const projects = [
  { name: "E-commerce Platform", desc: "Built scalable microservices architecture serving 2M+ users" },
  { name: "Real-time Analytics", desc: "Designed real-time data pipeline processing 10K events/sec" },
];

const certifications = ["AWS Solutions Architect", "Google Cloud Professional", "Kubernetes Administrator"];

const CandidateProfile = () => {
  const { id } = useParams();
  const { applications } = useStore();
  const candidate = applications.find((a) => a.id === id);

  if (!candidate) {
    return (
      <PageLayout>
        <Link to="/candidates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Candidates
        </Link>
        <p className="text-muted-foreground">Candidate not found.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Link to="/candidates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Candidates
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-card lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">{candidate.avatar}</div>
            <h1 className="text-xl font-bold text-foreground mt-4">{candidate.candidate_name}</h1>
            <p className="text-muted-foreground text-sm">{candidate.role}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <MapPin className="w-3 h-3" /> {candidate.location}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${candidate.status === "selected" ? "bg-emerald-50 text-emerald-600" : candidate.status === "rejected" ? "bg-red-50 text-red-500" : "bg-secondary text-accent-foreground"}`}>{candidate.status}</span>
              <span className="px-2.5 py-1 rounded-full bg-secondary text-accent-foreground text-xs font-bold">{candidate.score}% match</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">{candidate.experience_years} years experience</div>
            <div className="flex gap-2 mt-5 w-full">
              <button className="flex-1 flex items-center justify-center gap-1.5 gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover-lift">
                <Mail className="w-4 h-4" /> Email
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 bg-muted text-muted-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                <Download className="w-4 h-4" /> Resume
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">Skill Evaluation</h2>
            <div className="space-y-4">
              {skillEvals.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">{s.name}</span>
                    <span className="text-accent-foreground font-semibold">{s.score}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${s.score}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full gradient-primary rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((s) => <span key={s} className="px-3 py-1.5 bg-secondary text-accent-foreground rounded-lg text-sm font-medium">{s}</span>)}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-3">Projects</h2>
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.name} className="p-4 bg-muted rounded-xl">
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-3">Certifications</h2>
            <div className="flex flex-wrap gap-2">
              {certifications.map((c) => <span key={c} className="px-3 py-1.5 bg-muted rounded-lg text-sm text-muted-foreground font-medium">{c}</span>)}
            </div>
          </div>

          {candidate.notes && (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-3">Notes</h2>
              <p className="text-sm text-muted-foreground">{candidate.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </PageLayout>
  );
};

export default CandidateProfile;
