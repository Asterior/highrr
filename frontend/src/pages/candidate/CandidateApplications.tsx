import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import PageLayout from "@/components/PageLayout";

const CandidateApplications = () => {
  const { user, applications, jobs } = useStore();
  const myApps = applications.filter((a) => a.user_id === user.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "selected": return "bg-emerald-50 text-emerald-600";
      case "rejected": return "bg-red-50 text-red-500";
      case "interview": return "bg-blue-50 text-blue-600";
      case "shortlisted": return "bg-amber-50 text-amber-600";
      default: return "bg-secondary text-accent-foreground";
    }
  };

  return (
    <PageLayout>
      <h1 className="text-3xl font-bold text-foreground">My Applications</h1>
      <p className="text-muted-foreground mt-1">{myApps.length} applications submitted</p>

      {myApps.length === 0 ? (
        <div className="mt-10 text-center py-16 bg-card rounded-2xl border border-border shadow-card">
          <p className="text-muted-foreground">No applications yet. Start browsing jobs!</p>
        </div>
      ) : (
        <div className="grid gap-4 mt-8">
          {myApps.map((app, i) => {
            const job = jobs.find((j) => j.id === app.job_id);
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
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>{app.status}</span>
                  </div>
                </div>

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
        </div>
      )}
    </PageLayout>
  );
};

export default CandidateApplications;
