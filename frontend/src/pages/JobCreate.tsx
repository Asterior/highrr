import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";

const JobCreate = () => {
  const navigate = useNavigate();
  const { addJob } = useStore();

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    salary: "",
    department: "Engineering",
    job_type: "full-time" as "full-time" | "intern" | "contract",
    required_skills: "",
    experience_required: "",
    status: "Active" as "Active" | "Draft" | "Paused",
  });

  const [customFields, setCustomFields] = useState<{ label: string; value: string }[]>([]);

  const addCustomField = () => setCustomFields([...customFields, { label: "", value: "" }]);
  const removeCustomField = (idx: number) => setCustomFields(customFields.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Missing required fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    addJob({
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
    toast({ title: "Job created!", description: `${form.title} has been posted.` });
    navigate("/jobs");
  };

  return (
    <PageLayout>
      <button onClick={() => navigate("/jobs")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </button>

      <h1 className="text-3xl font-bold text-foreground">Create Job</h1>
      <p className="text-muted-foreground mt-1">Fill in the details to post a new position</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Basic Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Job Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sr. Frontend Engineer" className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} placeholder="Detailed job description..." className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow resize-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Bangalore, IN" className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Department</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
                  <option>Engineering</option>
                  <option>Design</option>
                  <option>Product</option>
                  <option>Data</option>
                  <option>Marketing</option>
                  <option>Sales</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Requirements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Requirements</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Required Skills (comma-separated)</label>
              <input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} placeholder="React, TypeScript, Node.js" className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Experience Required</label>
              <input value={form.experience_required} onChange={(e) => setForm({ ...form, experience_required: e.target.value })} placeholder="e.g. 3+ years" className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
          </div>
        </motion.div>

        {/* Company Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Compensation & Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Salary</label>
              <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="e.g. ₹25-35 LPA" className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Job Type</label>
              <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value as any })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
                <option value="full-time">Full-time</option>
                <option value="intern">Intern</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
                <option>Active</option>
                <option>Draft</option>
                <option>Paused</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Custom Fields */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Additional Fields</h2>
            <button type="button" onClick={addCustomField} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
              <Plus className="w-4 h-4" /> Add Field
            </button>
          </div>
          {customFields.length === 0 && <p className="text-sm text-muted-foreground">No custom fields added yet.</p>}
          <div className="space-y-3">
            {customFields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input value={field.label} onChange={(e) => { const f = [...customFields]; f[idx].label = e.target.value; setCustomFields(f); }} placeholder="Field name" className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
                <input value={field.value} onChange={(e) => { const f = [...customFields]; f[idx].value = e.target.value; setCustomFields(f); }} placeholder="Value" className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
                <button type="button" onClick={() => removeCustomField(idx)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="flex gap-3">
          <Button type="submit" className="gradient-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover-lift">Create Job</Button>
          <Button type="button" variant="outline" onClick={() => navigate("/jobs")} className="rounded-xl">Cancel</Button>
        </div>
      </form>
    </PageLayout>
  );
};

export default JobCreate;
