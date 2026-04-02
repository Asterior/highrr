import { useState } from "react";
import { Calendar, List, Plus, Clock, User, Briefcase, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import PageLayout from "@/components/PageLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Interviews = () => {
  const { interviews, addInterview, deleteInterview, applications } = useStore();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showSchedule, setShowSchedule] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ application_id: "", interviewer_name: "", scheduled_at: "", interview_type: "technical" as const, notes: "" });

  const candidatesForInterview = applications.filter((a) => a.status === "interview" || a.status === "shortlisted");

  const handleSchedule = () => {
    const app = applications.find((a) => a.id === form.application_id);
    if (!app || !form.scheduled_at) return;
    const job = useStore.getState().jobs.find((j) => j.id === app.job_id);
    addInterview({
      application_id: form.application_id,
      candidate_name: app.candidate_name,
      job_title: job?.title || "Unknown",
      interviewer_id: "user-1",
      interviewer_name: form.interviewer_name || "Amit Kumar",
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      status: "scheduled",
      interview_type: form.interview_type,
      notes: form.notes,
    });
    toast({ title: "Interview scheduled", description: `Interview with ${app.candidate_name} has been scheduled.` });
    setShowSchedule(false);
    setForm({ application_id: "", interviewer_name: "", scheduled_at: "", interview_type: "technical", notes: "" });
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteInterview(deleteConfirm);
    toast({ title: "Interview cancelled", description: "The interview has been removed.", variant: "destructive" });
    setDeleteConfirm(null);
  };

  const scheduled = interviews.filter((i) => i.status === "scheduled");
  const completed = interviews.filter((i) => i.status === "completed");

  return (
    <PageLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Interviews</h1>
          <p className="text-muted-foreground mt-1">{scheduled.length} upcoming interviews</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted rounded-xl p-1">
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === "list" ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setView("calendar")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === "calendar" ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}><Calendar className="w-4 h-4" /></button>
          </div>
          <button onClick={() => setShowSchedule(true)} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover-lift">
            <Plus className="w-4 h-4" /> Schedule Interview
          </button>
        </div>
      </div>

      <div className="grid gap-4 mt-8">
        {scheduled.length > 0 && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</h2>}
        <AnimatePresence>
          {scheduled.map((interview, i) => (
            <motion.div key={interview.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.06 }} className="bg-card rounded-2xl border border-border p-6 shadow-card hover-lift">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {interview.candidate_name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{interview.candidate_name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{interview.job_title}</span>
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{interview.interviewer_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {format(new Date(interview.scheduled_at), "h:mm a · MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-2 mt-1 justify-end">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-accent-foreground">{interview.interview_type}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">{interview.status}</span>
                    </div>
                  </div>
                  <button onClick={() => setDeleteConfirm(interview.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {completed.length > 0 && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-4">Completed</h2>}
        {completed.map((interview, i) => (
          <motion.div key={interview.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border p-6 shadow-card opacity-70">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">
                {interview.candidate_name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{interview.candidate_name}</h3>
                <p className="text-sm text-muted-foreground">{interview.job_title} · {interview.interviewer_name}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">completed</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Schedule modal */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Candidate *</label>
              <select value={form.application_id} onChange={(e) => setForm({ ...form, application_id: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
                <option value="">Select candidate</option>
                {candidatesForInterview.map((a) => <option key={a.id} value={a.id}>{a.candidate_name} - {a.role}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Date & Time *</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Interviewer</label>
                <input value={form.interviewer_name} onChange={(e) => setForm({ ...form, interviewer_name: e.target.value })} placeholder="Amit Kumar" className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Type</label>
                <select value={form.interview_type} onChange={(e) => setForm({ ...form, interview_type: e.target.value as any })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
                  <option value="technical">Technical</option>
                  <option value="hr">HR</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Interview notes..." className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-shadow resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={!form.application_id || !form.scheduled_at}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cancel Interview?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will remove the interview from the schedule.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Keep</Button>
            <Button variant="destructive" onClick={handleDelete}>Cancel Interview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Interviews;
