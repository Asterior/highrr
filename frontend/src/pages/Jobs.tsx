import { useState, useEffect } from "react";
import { Search, Plus, MapPin, Users, MoreVertical, Trash2, Edit2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";
import VerificationBadge from "@/components/VerificationBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmployerBadgeResponse, getEmployerBadge } from "@/services/api";

const formatDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDeadlineIso = (value: string) => new Date(`${value}T23:59:59`).toISOString();

const Jobs = () => {
  const navigate = useNavigate();
  const { jobs, loadJobs, updateJob, deleteJob, isLoading } = useStore();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [badgesByRecruiter, setBadgesByRecruiter] = useState<Record<number, EmployerBadgeResponse>>({});

  const [form, setForm] = useState<{ title: string; description: string; location: string; salary: string; responsibilities: string; hiring_timeline: string; actively_hiring: boolean; department: string; job_type: "full-time" | "intern" | "contract"; required_skills: string; experience_required: string; status: "Active" | "Inactive"; application_deadline: string }>({ title: "", description: "", location: "", salary: "", responsibilities: "", hiring_timeline: "", actively_hiring: true, department: "Engineering", job_type: "full-time", required_skills: "", experience_required: "", status: "Active", application_deadline: "" });

  // Load jobs from database on component mount
  useEffect(() => {
    const loadJobsData = async () => {
      try {
        setLoadingMessage("Loading jobs...");
        await loadJobs();
        setLoadingMessage("");
      } catch (error) {
        console.error("Error loading jobs:", error);
        toast({ title: "Error", description: "Failed to load jobs from database", variant: "destructive" });
        setLoadingMessage("");
      }
    };
    loadJobsData();
  }, [loadJobs]);

  useEffect(() => {
    const recruiterIds = Array.from(new Set(jobs.map((job) => Number(job.created_by)).filter(Boolean)));
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
  }, [jobs, badgesByRecruiter]);

  const resetForm = () => setForm({ title: "", description: "", location: "", salary: "", responsibilities: "", hiring_timeline: "", actively_hiring: true, department: "Engineering", job_type: "full-time", required_skills: "", experience_required: "", status: "Active", application_deadline: "" });

  const departments = ["All", ...new Set(jobs.map((j) => j.department))];
  const filtered = jobs.filter((j) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || j.department === deptFilter;
    return matchSearch && matchDept;
  });

  const handleEdit = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setForm({ title: job.title, description: job.description, location: job.location, salary: job.salary, responsibilities: job.responsibilities || "", hiring_timeline: job.hiring_timeline || "", actively_hiring: job.actively_hiring ?? true, department: job.department, job_type: job.job_type, required_skills: job.required_skills.join(", "), experience_required: job.experience_required, status: job.is_active ? "Active" : "Inactive", application_deadline: formatDateInputValue(job.application_deadline) });
    setEditingJob(jobId);
    setMenuOpen(null);
  };

  const handleUpdate = async () => {
    if (!editingJob) return;
    try {
      setLoadingMessage("Updating job...");
      await updateJob(editingJob, {
        title: form.title,
        description: form.description,
        location: form.location,
        salary: form.salary,
        responsibilities: form.responsibilities,
        hiring_timeline: form.hiring_timeline,
        actively_hiring: form.actively_hiring,
        department: form.department,
        job_type: form.job_type,
        required_skills: form.required_skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience_required: form.experience_required,
        is_active: form.status === "Active",
        status: form.status,
        application_deadline: form.application_deadline ? toDeadlineIso(form.application_deadline) : undefined,
      });
      toast({ title: "Job updated", description: `${form.title} has been updated.` });
      setEditingJob(null);
      resetForm();
      setLoadingMessage("");
    } catch (error) {
      console.error("Error updating job:", error);
      toast({ title: "Error", description: "Failed to update job", variant: "destructive" });
      setLoadingMessage("");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setLoadingMessage("Deleting job...");
      const job = jobs.find((j) => j.id === deleteConfirm);
      await deleteJob(deleteConfirm);
      toast({ title: "Job deleted", description: `${job?.title} has been removed.`, variant: "destructive" });
      setDeleteConfirm(null);
      setMenuOpen(null);
      setLoadingMessage("");
    } catch (error: any) {
      console.error("Error deleting job:", error);
      const errorMessage = error.message || "Failed to delete job";
      toast({ 
        title: "Cannot Delete Job", 
        description: errorMessage.includes("active application") 
          ? errorMessage 
          : "Failed to delete job", 
        variant: "destructive" 
      });
      setLoadingMessage("");
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Openings</h1>
          <p className="text-muted-foreground mt-1">{jobs.filter((j) => j.recruiter_status === "Active").length} active positions</p>
        </div>
        <button onClick={() => navigate("/jobs/create")} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover-lift">
          <Plus className="w-4 h-4" /> Create Job
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
          {departments.map((d) => (<option key={d}>{d === "All" ? "All Departments" : d}</option>))}
        </select>
      </div>

      <div className="grid gap-4 mt-8">
        <AnimatePresence>
          {filtered.map((job, i) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border p-6 shadow-card hover-lift flex items-center justify-between">
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
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${job.recruiter_status === "Active" ? "bg-emerald-50 text-emerald-600" : job.recruiter_status === "Deadline Passed" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"}`}>{job.recruiter_status || job.status}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${job.company_verification_level === "trusted" ? "bg-emerald-500/10 text-emerald-700" : job.company_verification_level === "verified" ? "bg-violet-500/10 text-violet-700" : "bg-muted text-muted-foreground"}`}>
                    {job.company_verification_level === "trusted" ? "Trusted" : job.company_verification_level === "verified" ? "Verified" : "Basic"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    Trust {job.company_trust_score || 0}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                    Response {job.recruiter_response_rate || 0}%
                  </span>
                  {job.is_flagged && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">Risk Flag</span>}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{job.department}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{job.applications_label || `${job.application_count} applications`}</span>
                  {job.application_deadline && <span>Apply by {new Date(job.application_deadline).toLocaleDateString()}</span>}
                  {job.salary && <span>{job.salary}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/jobs/${job.id}`} className="p-2 rounded-lg hover:bg-muted transition-colors" title="View Details">
                  <Eye className="w-5 h-5 text-muted-foreground" />
                </Link>
                <div className="relative">
                  <button onClick={() => setMenuOpen(menuOpen === job.id ? null : job.id)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                  </button>
                  {menuOpen === job.id && (
                    <div className="absolute right-0 top-10 w-36 bg-background rounded-xl border border-border shadow-elevated p-1 z-10">
                      <button onClick={() => handleEdit(job.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button onClick={() => { setDeleteConfirm(job.id); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {jobs.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No jobs found. Create one to get started!</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingJob} onOpenChange={() => { setEditingJob(null); resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Job Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow resize-none" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Responsibilities</label>
                <textarea value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} rows={2} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Hiring Timeline</label>
                <input value={form.hiring_timeline} onChange={(e) => setForm({ ...form, hiring_timeline: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.actively_hiring} onChange={(e) => setForm({ ...form, actively_hiring: e.target.checked })} className="h-4 w-4 rounded border-border" />
                Actively hiring confirmation
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Salary</label>
                <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Department</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
                  <option>Engineering</option><option>Design</option><option>Product</option><option>Data</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Last Date to Apply</label>
              <input type="date" value={form.application_deadline} onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Required Skills</label>
              <input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingJob(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isLoading}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Job?</DialogTitle></DialogHeader>
          {deleteConfirm && jobs.find(j => j.id === deleteConfirm)?.application_count ? (
            <>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-destructive font-semibold mb-1">Cannot Delete Job</p>
                <p className="text-sm text-muted-foreground">
                  This job has <span className="font-semibold text-destructive">{jobs.find(j => j.id === deleteConfirm)?.application_count}</span> active application(s).
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please review or reject all applications before deleting this job.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setDeleteConfirm(null)}>Close</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>Delete</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Jobs;
