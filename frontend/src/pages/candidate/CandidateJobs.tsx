import { useState, useEffect } from "react";
import { Search, MapPin, Briefcase, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import VerificationBadge from "@/components/VerificationBadge";
import { EmployerBadgeResponse, getEmployerBadge, getJobMatchScore, JobMatchScore } from "@/services/api";

interface ScoreMap {
  [jobId: string]: JobMatchScore | null;
}

const ringColor = (score: number): string => {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
};

const CandidateJobs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { jobs, applyToJob, loadJobs, isLoading } = useStore();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [confirmApply, setConfirmApply] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [matchScores, setMatchScores] = useState<ScoreMap>({});
  const [badgesByRecruiter, setBadgesByRecruiter] = useState<Record<number, EmployerBadgeResponse>>({});

  // Load jobs from API on component mount
  useEffect(() => {
    const loadJobsData = async () => {
      try {
        setLoadingMessage("Loading jobs...");
        await loadJobs();
        setLoadingMessage("");
      } catch (error) {
        console.error("Error loading jobs:", error);
        toast({ title: "Error", description: "Failed to load jobs", variant: "destructive" });
        setLoadingMessage("");
      }
    };
    loadJobsData();
  }, [loadJobs]);

  useEffect(() => {
    const jobId = searchParams.get("job");
    if (!jobId) return;

    const shouldApply = searchParams.get("apply") === "1";
    if (shouldApply) {
      setConfirmApply(jobId);
      setSelectedJob(null);
      return;
    }

    setSelectedJob(jobId);
  }, [searchParams]);

  const visibleJobs = jobs;
  const departments = ["All", ...new Set(visibleJobs.map((j) => j.department))];

  const filtered = visibleJobs.filter((j) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.description.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || j.department === deptFilter;
    const matchType = typeFilter === "All" || j.job_type === typeFilter;
    return matchSearch && matchDept && matchType;
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || filtered.length === 0) return;

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      const updates: ScoreMap = {};
      const jobsToFetch = filtered.filter((job) => !(job.id in matchScores));
      if (jobsToFetch.length === 0) return;

      await Promise.all(
        jobsToFetch.map(async (job) => {
          try {
            const score = await getJobMatchScore(job.id, token);
            updates[job.id] = score;
          } catch {
            updates[job.id] = null;
          }
        })
      );
      if (!cancelled) {
        setMatchScores((prev) => ({ ...prev, ...updates }));
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [filtered, matchScores]);

  useEffect(() => {
    const recruiterIds = Array.from(new Set(filtered.map((job) => Number(job.created_by)).filter(Boolean)));
    const missingIds = recruiterIds.filter((id) => !(id in badgesByRecruiter));
    if (missingIds.length === 0) return;

    let cancelled = false;
    const loadBadges = async () => {
      const updates: Record<number, EmployerBadgeResponse> = {};
      await Promise.all(
        missingIds.map(async (recruiterId) => {
          try {
            updates[recruiterId] = await getEmployerBadge(recruiterId);
          } catch {
            // Badge is optional and should fail silently.
          }
        })
      );
      if (!cancelled && Object.keys(updates).length > 0) {
        setBadgesByRecruiter((prev) => ({ ...prev, ...updates }));
      }
    };

    loadBadges().catch(() => {
      // Badge is optional and should fail silently.
    });

    return () => {
      cancelled = true;
    };
  }, [filtered, badgesByRecruiter]);

  const handleApply = async () => {
    if (!confirmApply) return;
    try {
      const success = await applyToJob(confirmApply);
      if (success) {
        toast({ title: "Application submitted!", description: "Your application has been sent successfully." });
      } else {
        toast({ title: "Already applied", description: "You've already applied to this job.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error applying to job:", error);
      toast({ title: "Error", description: "Failed to submit application", variant: "destructive" });
    } finally {
      setConfirmApply(null);
    }
  };

  const viewJob = jobs.find((j) => j.id === selectedJob);

  if (loadingMessage) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{loadingMessage}</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <h1 className="text-3xl font-bold text-foreground">Browse Jobs</h1>
      <p className="text-muted-foreground mt-1">{visibleJobs.filter((j) => j.candidate_status === "Active").length} open positions</p>

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
          const applied = Boolean(job.has_applied);
          const score = matchScores[job.id];
          const total = score?.total_score ?? 0;
          const radius = 22;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (Math.max(0, Math.min(total, 100)) / 100) * circumference;

          return (
            <motion.div key={job.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border p-6 shadow-card hover-lift">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {badgesByRecruiter[Number(job.created_by)] && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Company {job.created_by}</span>
                      <VerificationBadge
                        badgeLevel={badgesByRecruiter[Number(job.created_by)].badge_level}
                        checks={{
                          gst: badgesByRecruiter[Number(job.created_by)].gst_verified,
                          domain: badgesByRecruiter[Number(job.created_by)].domain_verified,
                          linkedin: badgesByRecruiter[Number(job.created_by)].linkedin_verified,
                        }}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-accent-foreground">{job.job_type}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${job.candidate_status === "Active" ? "bg-emerald-50 text-emerald-600" : job.candidate_status === "Applied" ? "bg-sky-50 text-sky-700" : "bg-muted text-muted-foreground"}`}>{job.candidate_status || "Inactive"}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{job.department}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                    {job.salary && <span>{job.salary}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.experience_required}</span>
                    {job.application_deadline && <span>Apply by {new Date(job.application_deadline).toLocaleDateString()}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{job.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {job.required_skills.map((s) => <span key={s} className="px-2.5 py-1 bg-muted rounded-lg text-xs text-muted-foreground font-medium">{s}</span>)}
                  </div>
                </div>
                <div className="ml-6 mr-2 min-w-[140px]">
                  {score ? (
                    <div className="rounded-xl border border-border bg-muted/40 p-3">
                      <div className="relative flex items-center justify-center">
                        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                          <circle cx="28" cy="28" r={radius} stroke="#e5e7eb" strokeWidth="6" fill="none" />
                          <circle
                            cx="28"
                            cy="28"
                            r={radius}
                            stroke={ringColor(total)}
                            strokeWidth="6"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                          />
                        </svg>
                        <span className="absolute text-sm font-bold text-foreground">{total}%</span>
                      </div>
                      <p className="mt-2 text-center text-xs font-semibold text-foreground">{score.match_label} Match</p>

                      <div className="mt-3 space-y-2">
                        {[
                          { label: "Skills", value: score.breakdown.skills, max: 40 },
                          { label: "Experience", value: score.breakdown.experience, max: 25 },
                          { label: "Location", value: score.breakdown.location, max: 15 },
                          { label: "Salary", value: score.breakdown.salary, max: 20 },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
                              <span>{item.label}</span>
                              <span>{item.value}/{item.max}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-200">
                              <div
                                className="h-1.5 rounded-full bg-violet-500"
                                style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                      Complete profile for match score
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => setSelectedJob(job.id)} className="px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                    Details
                  </button>
                  {applied ? (
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold">Applied ✓</span>
                  ) : !job.can_apply ? (
                    <span className="px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-semibold">Inactive</span>
                  ) : (
                    <button onClick={() => setConfirmApply(job.id)} disabled={isLoading} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover-lift disabled:opacity-50 disabled:cursor-not-allowed">
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
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</p>
                      <p className="text-sm font-semibold text-foreground">Recruiter profile #{viewJob.created_by}</p>
                      <p className="text-xs text-muted-foreground mt-1">Open the company profile to see trust data before applying.</p>
                    </div>
                    <Button variant="outline" onClick={() => navigate(`/candidate/company/${viewJob.created_by}`)}>View Company</Button>
                  </div>
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
                {viewJob.can_apply && !viewJob.has_applied && (
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
