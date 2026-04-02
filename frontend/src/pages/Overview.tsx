import { Briefcase, Users, Calendar, Clock, Plus, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useStore } from "@/stores/useStore";
import PageLayout from "@/components/PageLayout";
import MetricCard from "@/components/MetricCard";

const heroMetrics = [
  { label: "Pipeline Progress", value: 72 },
  { label: "Candidate Quality", value: 85 },
  { label: "Interview Rate", value: 64 },
];

const Overview = () => {
  const { jobs, applications, interviews, user } = useStore();

  const activeJobs = jobs.filter((j) => j.status === "Active").length;
  const totalCandidates = applications.length;
  const upcomingInterviews = interviews.filter((i) => i.status === "scheduled").length;
  const topCandidates = [...applications].sort((a, b) => b.score - a.score).slice(0, 5);

  const funnelData = [
    { stage: "Applied", count: applications.filter((a) => a.status === "applied").length },
    { stage: "Shortlisted", count: applications.filter((a) => a.status === "shortlisted").length },
    { stage: "Interview", count: applications.filter((a) => a.status === "interview").length },
    { stage: "Selected", count: applications.filter((a) => a.status === "selected").length },
    { stage: "Rejected", count: applications.filter((a) => a.status === "rejected").length },
  ];

  const activities = [
    { text: `New application received for ${jobs[0]?.title || "a position"}`, time: "2 min ago" },
    { text: `Interview scheduled with ${topCandidates[0]?.candidate_name || "a candidate"}`, time: "1 hour ago" },
    { text: `Offer sent to ${topCandidates[2]?.candidate_name || "a candidate"}`, time: "3 hours ago" },
    { text: `Job posting published: ${jobs[3]?.title || "New Role"}`, time: "5 hours ago" },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: `linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)`, backgroundSize: "24px 24px" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary/50" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-3">
              <span className="inline-block px-3 py-1 rounded-full bg-secondary text-accent-foreground text-xs font-semibold tracking-wider uppercase mb-5">Hiring Overview</span>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.1] text-foreground">
                Welcome back, {user.name.split(" ")[0]} 👋
                <br />
                <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">Start Hiring Smarter.</span>
              </h1>
              <p className="text-lg text-muted-foreground mt-5 max-w-lg">Track candidates, optimize hiring, and make better decisions — all from one place.</p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link to="/jobs" className="inline-flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover-lift"><Plus className="w-4 h-4" /> Create Job</Link>
                <Link to="/candidates" className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-6 py-3 rounded-xl text-sm font-semibold hover-lift shadow-card"><Eye className="w-4 h-4" /> View Candidates</Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="lg:col-span-2">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-hover">
                <h3 className="text-sm font-semibold text-foreground mb-5">Live Hiring Snapshot</h3>
                <div className="space-y-5">
                  {heroMetrics.map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground font-medium">{m.label}</span>
                        <span className="text-foreground font-semibold">{m.value}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${m.value}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full gradient-primary rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Conversion Rate</span>
                  <span className="text-lg font-bold text-accent-foreground">32%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <PageLayout>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          <MetricCard title="Active Jobs" value={activeJobs} change={`${activeJobs} open`} icon={Briefcase} index={0} />
          <MetricCard title="Candidates" value={totalCandidates} change={`${applications.filter((a) => a.status === "applied").length} new`} icon={Users} index={1} />
          <MetricCard title="Interviews" value={upcomingInterviews} change={`${upcomingInterviews} upcoming`} icon={Calendar} index={2} />
          <MetricCard title="Time to Hire" value="18d" change="-2d vs last month" icon={Clock} index={3} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-10 bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Hiring Funnel</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
              <XAxis dataKey="stage" tick={{ fontSize: 13 }} stroke="hsl(220 9% 46%)" />
              <YAxis tick={{ fontSize: 13 }} stroke="hsl(220 9% 46%)" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220 13% 91%)", boxShadow: "var(--shadow-elevated)" }} />
              <Bar dataKey="count" fill="hsl(263 70% 66%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Top Candidates</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {topCandidates.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }} className="min-w-[200px] bg-card rounded-2xl border border-border p-5 shadow-card hover-lift">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">{c.avatar}</div>
                <p className="font-semibold text-foreground mt-3">{c.candidate_name}</p>
                <p className="text-sm text-muted-foreground">{c.role}</p>
                <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-accent-foreground text-xs font-semibold">{c.score}% match</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {activities.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }} className="flex items-start gap-3">
                <div className="mt-1.5 w-2 h-2 rounded-full gradient-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Overview;
