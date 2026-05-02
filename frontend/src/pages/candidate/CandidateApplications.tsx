import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

const CandidateApplications = () => {
  const { user, applications, jobs, interviews, loadApplications, loadInterviews, loadJobs, isLoading } = useStore();

  // Load applications from API on component mount
  useEffect(() => {
    const loadApps = async () => {
      try {
        await Promise.all([loadApplications(), loadInterviews(true), loadJobs()]);
      } catch (error) {
        console.error("Error loading applications:", error);
        toast({ title: "Error", description: "Failed to load applications", variant: "destructive" });
      }
    };
    loadApps();
  }, [loadApplications, loadInterviews, loadJobs]);

  const myApps = applications.filter((a) => String(a.user_id) === String(user.id));
  const activeApps = myApps.filter((a) => !["selected", "rejected"].includes(a.status));
  const closedApps = myApps.filter((a) => ["selected", "rejected"].includes(a.status));

  const interviewMap = useMemo(() => {
    const map = new Map<string, typeof interviews[number]>();
    interviews.forEach((interview) => {
      map.set(interview.application_id, interview);
    });
    return map;
  }, [interviews]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "selected": return "bg-emerald-50 text-emerald-600";
      case "rejected": return "bg-red-50 text-red-500";
      case "interview": return "bg-blue-50 text-blue-600";
      case "shortlisted": return "bg-amber-50 text-amber-600";
      default: return "bg-secondary text-accent-foreground";
    }
  };

  const getStatusLabel = (status: string) => (status === "selected" ? "hired" : status);

  return (
    <PageLayout>
      {isLoading && myApps.length === 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
          Loading your applications...
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Applications</h1>
          <p className="text-muted-foreground mt-1">{activeApps.length} active applications · {closedApps.length} outcomes</p>
        </div>
        <Link to="/candidate/shortlisted" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 transition-opacity">
          View shortlist and interview card
        </Link>
      </div>

      {myApps.length === 0 ? (
        <div className="mt-10 text-center py-16 bg-card rounded-2xl border border-border shadow-card">
          <p className="text-muted-foreground">No applications yet. Start browsing jobs!</p>
        </div>
      ) : (
        <div className="grid gap-4 mt-8">
          {activeApps.map((app, i) => {
            const job = jobs.find((j) => j.id === app.job_id);
            const interview = interviewMap.get(app.id);
            return (
              <motion.div key={app.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border p-6 shadow-card hover-lift">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{job?.title || app.role}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{job?.department} · {job?.location}</p>
                    <p className="text-xs text-muted-foreground mt-1">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full bg-secondary text-accent-foreground text-xs font-bold">{app.score}% match</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>{getStatusLabel(app.status)}</span>
                  </div>
                </div>

                {interview && (
                  <div className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p>Interview status: <span className="font-semibold text-foreground capitalize">{interview.status}</span></p>
                    {interview.candidate_response_status && (
                      <p className="mt-1">Your response: <span className="font-semibold text-foreground capitalize">{interview.candidate_response_status}</span></p>
                    )}
                  </div>
                )}

                {app.status_history && app.status_history.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Status Timeline</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {app.status_history.map((h, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full gradient-primary" />
                            <span className="text-xs text-foreground capitalize">{h.status}</span>
                            <span className="text-[10px] text-muted-foreground">{h.date}</span>
                          </div>
                          {idx < app.status_history!.length - 1 && <div className="w-6 h-px bg-border" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {closedApps.length > 0 && (
            <div className="mt-2">
              <h2 className="text-lg font-semibold text-foreground">Final outcomes</h2>
              <p className="text-sm text-muted-foreground">Feedback and confirmation for completed hiring decisions.</p>
            </div>
          )}

          {closedApps.map((app, i) => {
            const job = jobs.find((j) => j.id === app.job_id);
            const interview = interviewMap.get(app.id);
            const displayedStatus = interview?.recruiter_decision
              ? interview.recruiter_decision === "hire"
                ? "selected"
                : interview.recruiter_decision === "reject"
                ? "rejected"
                : app.status
              : app.status;
            return (
              <motion.div key={`closed-${app.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{job?.title || app.role}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{job?.department} · {job?.location}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(displayedStatus)}`}>{getStatusLabel(displayedStatus)}</span>
                </div>

                <div className="mt-3 rounded-xl bg-muted/60 p-4">
                  <p className="text-xs text-muted-foreground">Recruiter update</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {interview?.recruiter_decision
                      ? interview.recruiter_decision === "hire"
                        ? "You are hired for this role."
                        : interview.recruiter_decision === "reject"
                        ? "Your application was not selected this time."
                        : "Your profile is on hold for the next round."
                      : app.status === "selected"
                      ? "You are hired for this role."
                      : "Your application was not selected this time."}
                  </p>
                  {interview?.feedback_notes && (
                    <p className="text-sm text-muted-foreground mt-2">Feedback: {interview.feedback_notes}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
};

export default CandidateApplications;
