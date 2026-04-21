import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Filter,
  LayoutGrid,
  PanelRightOpen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";

type ScheduleMode = "online" | "offline";

const defaultSchedule: {
  scheduled_at: string;
  interviewer_name: string;
  interview_type: "technical" | "hr" | "manager";
  mode: ScheduleMode;
  timezone: string;
  meeting_link: string;
  location: string;
  notes: string;
} = {
  scheduled_at: "",
  interviewer_name: "",
  interview_type: "technical",
  mode: "online",
  timezone: "Asia/Kolkata",
  meeting_link: "",
  location: "",
  notes: "",
};

const feedbackDefaults = {
  rating: 4,
  decision: "hold" as "hire" | "reject" | "hold",
  notes: "",
};

const ShortlistedCandidates = () => {
  const {
    user,
    jobs,
    applications,
    interviews,
    loadJobs,
    loadApplications,
    loadInterviews,
    scheduleInterview,
    updateApplicationStatus,
    captureInterviewFeedback,
  } = useStore();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState(defaultSchedule);
  const [feedbackForm, setFeedbackForm] = useState(feedbackDefaults);
  const [loadingMessage, setLoadingMessage] = useState("Loading shortlisted candidates...");
  const [viewMode, setViewMode] = useState<"board" | "timeline">("board");

  const activeInterview = activeInterviewId ? interviews.find((interview) => interview.id === activeInterviewId) : null;
  const isDecisionLocked = Boolean(activeInterview?.recruiter_decision);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingMessage("Loading shortlisted candidates...");
        await Promise.all([loadJobs(), loadApplications("shortlisted"), loadInterviews()]);
        setLoadingMessage("");
      } catch (error) {
        console.error("Failed to load shortlisted data:", error);
        toast({ title: "Error", description: "Could not load shortlisted candidates.", variant: "destructive" });
        setLoadingMessage("");
      }
    };
    loadData();
  }, [loadJobs, loadApplications, loadInterviews]);

  const shortlisted = applications
    .filter((app) => app.status === "shortlisted")
    .filter((app) => {
      const query = search.toLowerCase();
      return (
        app.candidate_name.toLowerCase().includes(query) ||
        app.role.toLowerCase().includes(query) ||
        app.skills.some((skill) => skill.toLowerCase().includes(query))
      );
    });

  const activeInterviews = interviews.filter((interview) => interview.status === "scheduled" || interview.status === "rescheduled" || interview.status === "completed");
  const selectedApps = shortlisted.filter((app) => selectedIds.includes(app.id));
  const primarySelected = selectedApps[0];

  const conflictCandidates = useMemo(() => {
    if (!scheduleForm.scheduled_at || !scheduleForm.interviewer_name) return [];
    const target = new Date(scheduleForm.scheduled_at).getTime();
    return interviews.filter((interview) => {
      if (interview.interviewer_name !== scheduleForm.interviewer_name) return false;
      const interviewTime = new Date(interview.scheduled_at).getTime();
      return Math.abs(interviewTime - target) < 45 * 60 * 1000;
    });
  }, [interviews, scheduleForm.interviewer_name, scheduleForm.scheduled_at]);

  const suggestedSlots = useMemo(() => {
    if (!scheduleForm.scheduled_at) return [];
    const base = new Date(scheduleForm.scheduled_at).getTime();
    const slots: string[] = [];

    for (let offset = 30; slots.length < 3 && offset <= 180; offset += 30) {
      const candidateTime = new Date(base + offset * 60 * 1000).toISOString();
      const conflict = interviews.some((interview) => {
        if (interview.interviewer_name !== scheduleForm.interviewer_name) return false;
        const interviewTime = new Date(interview.scheduled_at).getTime();
        return Math.abs(interviewTime - new Date(candidateTime).getTime()) < 45 * 60 * 1000;
      });
      if (!conflict) {
        slots.push(candidateTime);
      }
    }

    return slots;
  }, [interviews, scheduleForm.interviewer_name, scheduleForm.scheduled_at]);

  const shortlistStats = [
    { label: "Shortlisted", value: shortlisted.length, icon: Target, tone: "from-fuchsia-500 to-violet-600" },
    { label: "Upcoming interviews", value: activeInterviews.length, icon: CalendarClock, tone: "from-sky-500 to-cyan-500" },
    { label: "Conflict checks", value: conflictCandidates.length, icon: CircleAlert, tone: "from-amber-500 to-orange-500" },
    { label: "Bulk selected", value: selectedIds.length, icon: Users, tone: "from-emerald-500 to-teal-500" },
  ];

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const openSchedule = (ids: string[]) => {
    if (!ids.length) return;
    const first = shortlisted.find((app) => app.id === ids[0]);
    setSelectedIds(ids);
    setScheduleForm({
      ...defaultSchedule,
      interviewer_name: user.name,
      notes: first ? `Interview for ${first.candidate_name} · ${first.role}` : "",
    });
    setScheduleOpen(true);
  };

  const saveSchedule = async () => {
    if (!selectedApps.length || !scheduleForm.scheduled_at) return;
    if (conflictCandidates.length > 0) {
      toast({ title: "Conflict detected", description: "Pick one of the suggested slots before saving.", variant: "destructive" });
      return;
    }

    const scheduledAtIso = new Date(scheduleForm.scheduled_at).toISOString();
    const results = await Promise.allSettled(
      selectedApps.map(async (app) => {
        const created = await scheduleInterview({
          application_id: app.id,
          interviewer_id: String(user.id),
          scheduled_at: scheduledAtIso,
          interview_type: scheduleForm.interview_type,
          mode: scheduleForm.mode,
          timezone: scheduleForm.timezone,
          notes: scheduleForm.notes,
          meeting_link: scheduleForm.mode === "online" ? scheduleForm.meeting_link : undefined,
          location: scheduleForm.mode === "offline" ? scheduleForm.location : undefined,
        });

        if (!created) {
          throw new Error(`Failed to schedule ${app.candidate_name}`);
        }

        const moved = await updateApplicationStatus(app.id, "interview");
        if (!moved) {
          throw new Error(`Failed to move ${app.candidate_name} to interview`);
        }
      }),
    );

    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failureCount = results.length - successCount;

    if (successCount > 0) {
      toast({
        title: "Interview scheduled",
        description: `${successCount} candidate${successCount === 1 ? "" : "s"} moved to interview stage.`,
      });
    }

    if (failureCount > 0) {
      toast({
        title: "Partial failure",
        description: `${failureCount} schedule action${failureCount === 1 ? "" : "s"} could not be completed.`,
        variant: "destructive",
      });
    }

    setScheduleOpen(false);
    setSelectedIds([]);
    setScheduleForm(defaultSchedule);
  };

  const saveFeedback = async () => {
    if (!activeInterviewId) return;
    const ok = await captureInterviewFeedback(activeInterviewId, feedbackForm);
    if (ok) {
      toast({ title: "Feedback saved", description: "Interview feedback and decision were captured." });
      setFeedbackOpen(false);
      setActiveInterviewId(null);
      setFeedbackForm(feedbackDefaults);
    } else {
      toast({ title: "Error", description: "Failed to save interview feedback.", variant: "destructive" });
    }
  };

  const updateConflictSuggestion = (slot: string) => {
    setScheduleForm((prev) => ({ ...prev, scheduled_at: slot }));
  };

  const getModeLabel = (mode?: string) => (mode === "offline" ? "Offline" : "Online");

  if (loadingMessage) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-[#12071f] via-[#1a1330] to-[#080813] p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.28),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.18),_transparent_24%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-white/80 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Shortlisted candidate command center
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">A focused shortlist workspace with scheduling, conflict checks, and feedback in one flow.</h1>
            <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Handle shortlisted candidates without the usual clutter. Select one or many candidates, open the schedule drawer instantly, auto-fill the essentials, and move them into interview stage with a clean audit trail.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
            {shortlistStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                  <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${stat.tone} p-2 text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-white/65">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-muted px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates, role, or skill"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setViewMode((prev) => (prev === "board" ? "timeline" : "board"))}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {viewMode === "board" ? <LayoutGrid className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            {viewMode === "board" ? "Timeline view" : "Board view"}
          </button>
          <button
            onClick={() => openSchedule(selectedIds)}
            disabled={!selectedIds.length}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Bulk schedule
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-fuchsia-200/40 bg-fuchsia-50 px-4 py-3 text-fuchsia-900">
          <span className="text-sm font-semibold">{selectedIds.length} shortlisted candidate{selectedIds.length > 1 ? "s" : ""} selected</span>
          <span className="text-xs text-fuchsia-700">Same slot scheduling ready</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => setSelectedIds([])}>Clear</Button>
            <Button onClick={() => openSchedule(selectedIds)}>Schedule now</Button>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Shortlisted candidates</h2>
              <p className="text-sm text-muted-foreground">One click from shortlist to schedule drawer.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-accent-foreground">
              <Filter className="h-3.5 w-3.5" /> {shortlisted.length} results
            </div>
          </div>

          {viewMode === "board" ? (
            <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2">
              {shortlisted.map((app, index) => {
                const job = jobs.find((item) => item.id === app.job_id);
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card hover-lift"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(app.id)}
                          onChange={() => toggleSelected(app.id)}
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
                          {app.avatar}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-foreground">{app.candidate_name}</h3>
                          <p className="truncate text-sm text-muted-foreground">{job?.title || app.role || "Open role"}</p>
                          <p className="text-xs text-muted-foreground">{job?.department || "General"} · {job?.location || app.location || "Remote"}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600">{app.score}%</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {app.skills.slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2 rounded-2xl bg-muted/70 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Experience</span>
                        <span className="font-medium text-foreground">{app.experience_years} years</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Contact</span>
                        <span className="font-medium text-foreground">{app.phone || app.candidate_email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-foreground shadow-sm">
                          {app.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link to={`/candidates/${app.id}`}>View profile</Link>
                      </Button>
                      <Button className="flex-1" onClick={() => openSchedule([app.id])}>
                        <CalendarClock className="mr-2 h-4 w-4" /> Schedule
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {shortlisted.map((app, index) => {
                const job = jobs.find((item) => item.id === app.job_id);
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex flex-col gap-4 rounded-[1.25rem] border border-border bg-card p-5 shadow-card lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(app.id)}
                        onChange={() => toggleSelected(app.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-sm font-bold text-white">
                        {app.avatar}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">{app.candidate_name}</h3>
                        <p className="truncate text-sm text-muted-foreground">{job?.title || app.role} · {job?.department || "Department"}</p>
                        <p className="text-xs text-muted-foreground">Applied {format(new Date(app.applied_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-accent-foreground">{app.score}% match</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">{app.status}</span>
                      <Button asChild variant="outline">
                        <Link to={`/candidates/${app.id}`}>Profile</Link>
                      </Button>
                      <Button onClick={() => openSchedule([app.id])}>
                        <Plus className="mr-2 h-4 w-4" /> One-click schedule
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {shortlisted.length === 0 && (
            <div className="rounded-[1.5rem] border border-border bg-card p-10 text-center shadow-card">
              <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No shortlisted candidates yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Shortlist candidates from the pipeline to unlock the scheduling flow here.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[1.5rem] border-border shadow-card">
            <CardHeader className="bg-gradient-to-br from-[#160a29] to-[#1b1535] text-white">
              <CardTitle className="text-xl">Interview timeline</CardTitle>
              <CardDescription className="text-white/70">Scheduled interviews and quick feedback actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              {activeInterviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
                  Interviews scheduled from shortlisted candidates will appear here.
                </div>
              ) : (
                activeInterviews.map((interview) => (
                  <div key={interview.id} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="max-w-[11rem] truncate font-semibold text-foreground">{interview.candidate_name}</span>
                          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">{getModeLabel(interview.mode)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{interview.job_title} · {interview.interview_type}</p>
                        {interview.recruiter_decision && (
                          <p className="mt-1 text-xs font-semibold text-foreground">
                            Decision: {interview.recruiter_decision === "hire" ? "Hired" : interview.recruiter_decision === "reject" ? "Rejected" : "On Hold"}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{interview.status}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(interview.scheduled_at), "EEE, MMM d · h:mm a")}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setActiveInterviewId(interview.id);
                        setFeedbackForm({ rating: interview.feedback_rating || 4, decision: interview.recruiter_decision || "hold", notes: interview.feedback_notes || "" });
                        setFeedbackOpen(true);
                      }}>
                        {interview.status === "completed" ? "Edit feedback" : "Add feedback"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-xl">Recruiter checklist</CardTitle>
              <CardDescription>Everything important stays in one place.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Select one candidate or bulk pick several shortlisted candidates.",
                "Choose online or offline mode before scheduling.",
                "Use the conflict checker before saving the slot.",
                "Capture feedback and decision immediately after the interview.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Schedule shortlisted candidates</SheetTitle>
            <SheetDescription>
              {selectedApps.length > 1
                ? `Bulk schedule ${selectedApps.length} shortlisted candidates with one shared slot.`
                : `Schedule ${primarySelected?.candidate_name || "candidate"} with the auto-filled shortlist context.`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div className="rounded-2xl bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedApps.map((app) => (
                  <span key={app.id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                    {app.candidate_name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Date & time</label>
              <input
                type="datetime-local"
                value={scheduleForm.scheduled_at}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Interviewer</label>
                <input
                  value={scheduleForm.interviewer_name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer_name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Round type</label>
                <select
                  value={scheduleForm.interview_type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, interview_type: e.target.value as typeof scheduleForm.interview_type })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
                >
                  <option value="technical">Technical</option>
                  <option value="hr">HR</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Mode</label>
                <select
                  value={scheduleForm.mode}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, mode: e.target.value as ScheduleMode })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Timezone</label>
                <input
                  value={scheduleForm.timezone}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {scheduleForm.mode === "online" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Meeting link</label>
                <input
                  value={scheduleForm.meeting_link}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, meeting_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Location</label>
                <input
                  value={scheduleForm.location}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                  placeholder="Office building, floor, room"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
              <Textarea
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                placeholder="What should the interviewer focus on?"
                className="min-h-[110px] rounded-2xl"
              />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <CircleAlert className="h-4 w-4" />
                <span className="text-sm font-semibold">Conflict checker</span>
              </div>
              {conflictCandidates.length > 0 ? (
                <div className="mt-3 space-y-3 text-sm text-amber-800">
                  <p>{conflictCandidates.length} overlapping interview{conflictCandidates.length > 1 ? "s" : ""} found for {scheduleForm.interviewer_name}.</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => updateConflictSuggestion(slot)}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm"
                      >
                        {format(new Date(slot), "MMM d · h:mm a")}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-amber-800">No conflict detected for the current slot.</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button variant="outline" onClick={() => setScheduleOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveSchedule} disabled={!scheduleForm.scheduled_at || !selectedApps.length || conflictCandidates.length > 0} className="flex-1">
              Move to interview
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture interview feedback</DialogTitle>
            <DialogDescription>Quick post-interview decision and note capture.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Rating</label>
              <input
                type="range"
                min="1"
                max="5"
                value={feedbackForm.rating}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                className="w-full"
              />
              <div className="mt-1 text-xs text-muted-foreground">{feedbackForm.rating} / 5</div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Decision</label>
              <select
                value={feedbackForm.decision}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, decision: e.target.value as typeof feedbackForm.decision })}
                disabled={isDecisionLocked}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
              >
                <option value="hire">Hire</option>
                <option value="reject">Reject</option>
                <option value="hold">Hold</option>
              </select>
              {isDecisionLocked && (
                <p className="mt-1 text-xs text-muted-foreground">Decision is locked after first save. You can still edit rating and notes.</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
              <Textarea
                value={feedbackForm.notes}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, notes: e.target.value })}
                placeholder="What stood out in the interview?"
                className="min-h-[120px] rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button onClick={saveFeedback}>Save feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default ShortlistedCandidates;
