import { useState } from "react";
import { Search, MapPin, Briefcase, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CandidateJobs = () => {
  const { jobs, applications, user, applyToJob } = useStore();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [confirmApply, setConfirmApply] = useState<string | null>(null);

  const activeJobs = jobs.filter((j) => j.status === "Active");
  const departments = ["All", ...new Set(activeJobs.map((j) => j.department))];
  const myAppJobIds = applications.filter((a) => a.user_id === user.id).map((a) => a.job_id);

  const filtered = activeJobs.filter((j) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.description.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || j.department === deptFilter;
    const matchType = typeFilter === "All" || j.job_type === typeFilter;
    return matchSearch && matchDept && matchType;
  });

  const handleApply = () => {
    if (!confirmApply) return;
    const success = applyToJob(confirmApply);
    if (success) {
      toast({ title: "Application submitted!", description: "Your application has been sent successfully." });
    } else {
      toast({ title: "Already applied", description: "You've already applied to this job.", variant: "destructive" });
    }
    setConfirmApply(null);
  };

  const viewJob = jobs.find((j) => j.id === selectedJob);

  return (
    <PageLayout>
      <h1 className="text-3xl font-bold text-foreground">Browse Jobs</h1>
      <p className="text-muted-foreground mt-1">{activeJobs.length} open positions</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
          {departments.map((d) => <option key={d}>{d === "All" ? "All Departments" : d}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
          <option value="All">All Types</option>
          <option value="full-time">Full-time</option>
          <option value="intern">Intern</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      <div className="grid gap-4 mt-8">
        {filtered.map((job, i) => {
          const applied = myAppJobIds.includes(job.id);
          return (
            <motion.div key={job.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border p-6 shadow-card hover-lift">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-accent-foreground">{job.job_type}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{job.department}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                    {job.salary && <span>{job.salary}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.experience_required}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{job.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {job.required_skills.map((s) => <span key={s} className="px-2.5 py-1 bg-muted rounded-lg text-xs text-muted-foreground font-medium">{s}</span>)}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => setSelectedJob(job.id)} className="px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                    Details
                  </button>
                  {applied ? (
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold">Applied ✓</span>
                  ) : (
                    <button onClick={() => setConfirmApply(job.id)} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover-lift">
                      Apply
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Job Details Modal */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewJob && (
            <>
              <DialogHeader>
                <DialogTitle>{viewJob.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{viewJob.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{viewJob.department}</span>
                  <span>{viewJob.salary}</span>
                  <span>{viewJob.experience_required}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-accent-foreground">{viewJob.job_type}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{viewJob.description}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewJob.required_skills.map((s) => <span key={s} className="px-3 py-1.5 bg-secondary text-accent-foreground rounded-lg text-sm font-medium">{s}</span>)}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>
                {!myAppJobIds.includes(viewJob.id) && (
                  <Button onClick={() => { setConfirmApply(viewJob.id); setSelectedJob(null); }}>Apply Now</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Apply */}
      <Dialog open={!!confirmApply} onOpenChange={() => setConfirmApply(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Confirm Application</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Submit your application for this position? Your profile information will be shared with the employer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApply(null)}>Cancel</Button>
            <Button onClick={handleApply}>Submit Application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default CandidateJobs;
