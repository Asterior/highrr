import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Briefcase, Clock, Users, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import PageLayout from "@/components/PageLayout";

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobs, applications } = useStore();
  const job = jobs.find((j) => j.id === id);

  if (!job) {
    return (
      <PageLayout>
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>
        <p className="text-muted-foreground">Job not found.</p>
      </PageLayout>
    );
  }

  const jobApps = applications.filter((a) => a.job_id === job.id);
  const statusCounts = {
    applied: jobApps.filter((a) => a.status === "applied").length,
    shortlisted: jobApps.filter((a) => a.status === "shortlisted").length,
    interview: jobApps.filter((a) => a.status === "interview").length,
    selected: jobApps.filter((a) => a.status === "selected").length,
    rejected: jobApps.filter((a) => a.status === "rejected").length,
  };

  return (
    <PageLayout>
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${job.status === "Active" ? "bg-emerald-50 text-emerald-600" : job.status === "Draft" ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"}`}>{job.status}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{job.department}</span>
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{job.experience_required}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{jobApps.length} applications</span>
              {job.salary && <span>{job.salary}</span>}
            </div>
          </div>
          <button onClick={() => navigate(`/pipeline?job=${job.id}`)} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift">
            View Pipeline
          </button>
        </div>

        {/* Pipeline Summary */}
        <div className="mt-8 bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pipeline Summary</h2>
          <div className="flex gap-4 flex-wrap">
            {(["applied", "shortlisted", "interview", "selected", "rejected"] as const).map((status) => (
              <div key={status} className="flex-1 min-w-[100px] text-center p-4 bg-muted rounded-xl">
                <p className="text-2xl font-bold text-foreground">{statusCounts[status]}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-3">Job Description</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
        </div>

        {/* Skills */}
        <div className="mt-6 bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-3">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {job.required_skills.map((s) => <span key={s} className="px-3 py-1.5 bg-secondary text-accent-foreground rounded-lg text-sm font-medium">{s}</span>)}
          </div>
        </div>

        {/* Candidates */}
        <div className="mt-6 bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Candidates ({jobApps.length})</h2>
          {jobApps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <div className="space-y-3">
              {jobApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">{app.avatar}</div>
                    <div>
                      <Link to={`/candidates/${app.id}`} className="font-medium text-foreground hover:text-primary transition-colors">{app.candidate_name}</Link>
                      <p className="text-xs text-muted-foreground">{app.candidate_email} {app.phone && `· ${app.phone}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {app.cgpa && <span className="text-xs text-muted-foreground">CGPA: {app.cgpa}</span>}
                    <span className="px-2.5 py-1 rounded-full bg-secondary text-accent-foreground text-xs font-bold">{app.score}%</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${app.status === "selected" ? "bg-emerald-50 text-emerald-600" : app.status === "rejected" ? "bg-red-50 text-red-500" : app.status === "interview" ? "bg-blue-50 text-blue-600" : "bg-secondary text-accent-foreground"}`}>{app.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </PageLayout>
  );
};

export default JobDetails;
