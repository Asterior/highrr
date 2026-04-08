import { Briefcase, FileText, Calendar, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useStore } from "@/stores/useStore";
import PageLayout from "@/components/PageLayout";
import MetricCard from "@/components/MetricCard";
import { toast } from "@/hooks/use-toast";

const CandidateDashboard = () => {
  const { user, applications, interviews, loadJobs, loadApplications, loadInterviews } = useStore();

  // Load jobs and applications from API on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadJobs(), loadApplications(), loadInterviews(true)]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      }
    };
    loadData();
  }, [loadJobs, loadApplications, loadInterviews]);

  const myApps = applications.filter((a) => String(a.user_id) === String(user.id));
  const myInterviews = interviews.filter((i) =>
    myApps.some((a) => a.id === i.application_id)
  );
  const upcomingInterviews = myInterviews.filter((i) => i.status === "scheduled");

  const statusCounts = {
    applied: myApps.filter((a) => a.status === "applied").length,
    shortlisted: myApps.filter((a) => a.status === "shortlisted").length,
    interview: myApps.filter((a) => a.status === "interview").length,
    selected: myApps.filter((a) => a.status === "selected").length,
    rejected: myApps.filter((a) => a.status === "rejected").length,
  };

  return (
    <PageLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-gradient-to-br from-white via-violet-50/40 to-white p-6 shadow-card">
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground mt-1">Track your applications, interviews, and profile strength from one place.</p>
        <div className="mt-4 flex gap-3 flex-wrap">
          <Link to="/candidate/jobs" className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift">
            Explore roles
          </Link>
          <Link to="/candidate/applications" className="bg-card border border-border text-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift shadow-card">
            View pipeline
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
        <MetricCard title="Applications" value={myApps.length} change={`${statusCounts.applied} pending`} icon={FileText} index={0} />
        <MetricCard title="Interviews" value={upcomingInterviews.length} change="upcoming" icon={Calendar} index={1} />
        <MetricCard title="Shortlisted" value={statusCounts.shortlisted} change={`${statusCounts.interview} in interview`} icon={TrendingUp} index={2} />
        <MetricCard title="Offers" value={statusCounts.selected} change={statusCounts.selected > 0 ? "Congratulations!" : "Keep going!"} icon={Briefcase} index={3} />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Application Status</h2>
        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <div className="flex gap-4 flex-wrap">
            {(["applied", "shortlisted", "interview", "selected", "rejected"] as const).map((status) => (
              <div key={status} className="flex-1 min-w-[120px] text-center p-4 bg-muted rounded-xl">
                <p className="text-2xl font-bold text-foreground">{statusCounts[status]}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {upcomingInterviews.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Interviews</h2>
          <div className="space-y-3">
            {upcomingInterviews.map((interview) => (
              <motion.div key={interview.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 shadow-card hover-lift">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{interview.job_title}</p>
                    <p className="text-sm text-muted-foreground mt-1">with {interview.interviewer_name} · {interview.interview_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{new Date(interview.scheduled_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(interview.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                {interview.meeting_link && (
                  <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm text-primary font-medium hover:underline">
                    Join Meeting →
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex gap-4">
        <Link to="/candidate/jobs" className="gradient-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover-lift">
          Browse Jobs
        </Link>
        <Link to="/candidate/applications" className="bg-card border border-border text-foreground px-6 py-3 rounded-xl text-sm font-semibold hover-lift shadow-card">
          View Applications
        </Link>
      </div>
    </PageLayout>
  );
};

export default CandidateDashboard;
