import { useState } from "react";
import { Search, Plus, MapPin, Users, MoreVertical, Trash2, Edit2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Jobs = () => {
  const navigate = useNavigate();
  const { jobs, updateJob, deleteJob } = useStore();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [form, setForm] = useState<{ title: string; description: string; location: string; salary: string; department: string; job_type: "full-time" | "intern" | "contract"; required_skills: string; experience_required: string; status: "Active" | "Draft" | "Paused" }>({ title: "", description: "", location: "", salary: "", department: "Engineering", job_type: "full-time", required_skills: "", experience_required: "", status: "Active" });

  const resetForm = () => setForm({ title: "", description: "", location: "", salary: "", department: "Engineering", job_type: "full-time", required_skills: "", experience_required: "", status: "Active" });

  const departments = ["All", ...new Set(jobs.map((j) => j.department))];
  const filtered = jobs.filter((j) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || j.department === deptFilter;
    return matchSearch && matchDept;
  });

  const handleEdit = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setForm({ title: job.title, description: job.description, location: job.location, salary: job.salary, department: job.department, job_type: job.job_type, required_skills: job.required_skills.join(", "), experience_required: job.experience_required, status: job.status });
    setEditingJob(jobId);
    setMenuOpen(null);
  };

  const handleUpdate = () => {
    if (!editingJob) return;
    updateJob(editingJob, {
      title: form.title,
      description: form.description,
      location: form.location,
      salary: form.salary,
      department: form.department,
      job_type: form.job_type,
      required_skills: form.required_skills.split(",").map((s) => s.trim()).filter(Boolean),
      experience_required: form.experience_required,
      is_active: form.status === "Active",
      status: form.status,
    });
    toast({ title: "Job updated", description: `${form.title} has been updated.` });
    setEditingJob(null);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const job = jobs.find((j) => j.id === deleteConfirm);
    deleteJob(deleteConfirm);
    toast({ title: "Job deleted", description: `${job?.title} has been removed.`, variant: "destructive" });
    setDeleteConfirm(null);
    setMenuOpen(null);
  };

  return (
    <PageLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Openings</h1>
          <p className="text-muted-foreground mt-1">{jobs.filter((j) => j.status === "Active").length} active positions</p>
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
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">{job.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${job.status === "Active" ? "bg-emerald-50 text-emerald-600" : job.status === "Draft" ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"}`}>{job.status}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{job.department}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{job.application_count} applications</span>
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
                  <option>Active</option><option>Draft</option><option>Paused</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Required Skills</label>
              <input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingJob(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Job?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Jobs;
