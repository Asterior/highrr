import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Calendar, CalendarDays, CheckCircle2, Clock3, Download, ExternalLink, MapPin, MessageSquareQuote, ShieldCheck, Sparkles, UserCheck, Video, X } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";

const CandidateShortlisted = () => {
  const { user, applications, interviews, jobs, loadApplications, loadInterviews, respondToInterview, isLoading } = useStore();
  const [loadingMessage, setLoadingMessage] = useState("Loading your shortlist...");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [preferredSlots, setPreferredSlots] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingMessage("Loading your shortlist...");
        await Promise.all([loadApplications(), loadInterviews(true)]);
        setLoadingMessage("");
      } catch (error) {
        console.error("Failed to load candidate shortlist:", error);
        toast({ title: "Error", description: "Could not load your shortlist.", variant: "destructive" });
        setLoadingMessage("");
      }
    };
    loadData();
  }, [loadApplications, loadInterviews]);

  const shortlistedApps = applications.filter((app) => app.user_id === String(user.id) && (app.status === "shortlisted" || app.status === "interview"));
  const upcomingInterview = useMemo(() => {
    return interviews
      .filter((interview) => interview.status === "scheduled" || interview.status === "rescheduled")
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  }, [interviews]);

  const decisionWindow = upcomingInterview
    ? format(new Date(new Date(upcomingInterview.scheduled_at).getTime() + 3 * 24 * 60 * 60 * 1000), "MMM d, yyyy")
    : "Within the recruiter's review window";

  const interviewTimeline = upcomingInterview
    ? [
        { label: "Scheduled", value: format(new Date(upcomingInterview.scheduled_at), "MMM d · h:mm a") },
        { label: "Updated", value: upcomingInterview.status === "rescheduled" ? "Rescheduled by recruiter" : "Latest slot sent" },
        { label: "Reminder sent", value: "24 hours and 1 hour before" },
        { label: "Decision expected", value: decisionWindow },
      ]
    : [];

  const confirmInterview = async () => {
    if (!upcomingInterview) return;
    const ok = await respondToInterview(upcomingInterview.id, "confirm", { preferred_timezone: upcomingInterview.timezone || undefined });
    if (ok) {
      toast({ title: "Confirmed", description: "Your interview attendance has been confirmed." });
    } else {
      toast({ title: "Error", description: "Could not confirm the interview.", variant: "destructive" });
    }
  };

  const openReschedule = (interviewId: string) => {
    setActiveInterviewId(interviewId);
    setRescheduleReason("");
    setPreferredSlots("");
    setRescheduleOpen(true);
  };

  const saveReschedule = async () => {
    if (!activeInterviewId) return;
    const slots = preferredSlots
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const ok = await respondToInterview(activeInterviewId, "reschedule", { reason: rescheduleReason, preferred_slots: slots });
    if (ok) {
      toast({ title: "Request sent", description: "Your reschedule request was shared with the recruiter." });
      setRescheduleOpen(false);
      setActiveInterviewId(null);
    } else {
      toast({ title: "Error", description: "Could not send the reschedule request.", variant: "destructive" });
    }
  };

  const addToCalendar = (interview: typeof upcomingInterview) => {
    if (!interview) return;
    const start = new Date(interview.scheduled_at);
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    const calendarUrl = new URL("https://calendar.google.com/calendar/render");
    calendarUrl.searchParams.set("action", "TEMPLATE");
    calendarUrl.searchParams.set("text", `${interview.job_title} interview with ${interview.interviewer_name}`);
    calendarUrl.searchParams.set("dates", `${start.toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${end.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
    calendarUrl.searchParams.set("details", interview.notes || "Interview scheduled on Highrr");
    if (interview.location) calendarUrl.searchParams.set("location", interview.location);
    if (interview.meeting_link) calendarUrl.searchParams.set("location", interview.meeting_link);
    window.open(calendarUrl.toString(), "_blank", "noopener,noreferrer");
  };

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
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-[#0d162c] via-[#1b1432] to-[#070913] p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.22),_transparent_25%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.22),_transparent_22%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-white/80 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Candidate shortlist and interview center
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Your interview story stays clear, calm, and easy to act on.</h1>
            <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              See the shortlisted roles, upcoming interview details, and everything the recruiter expects from you in one polished view. Confirm attendance, request a new slot, and keep the calendar synced.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
            {[
              { label: "Shortlisted", value: shortlistedApps.length, icon: UserCheck },
              { label: "Next interview", value: upcomingInterview ? "1" : "0", icon: CalendarDays },
              { label: "Mode", value: upcomingInterview ? (upcomingInterview.mode || "online") : "—", icon: Video },
              { label: "Decision ETA", value: decisionWindow.split(",")[0], icon: Clock3 },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                  <div className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 p-2 text-white">
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

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Interview card</h2>
              <p className="text-sm text-muted-foreground">Everything you need before the meeting starts.</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-accent-foreground">Candidate view</span>
          </div>

          {upcomingInterview ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-card"
            >
              <div className="border-b border-border bg-gradient-to-r from-[#160d2a] to-[#1f1638] p-6 text-white">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold">{user.name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <h3 className="text-2xl font-bold">{upcomingInterview.job_title}</h3>
                        <p className="text-sm text-white/70">Interview with {upcomingInterview.interviewer_name}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{upcomingInterview.interview_type}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize">{upcomingInterview.mode || "online"}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize">{upcomingInterview.status}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Clock3 className="h-4 w-4" />
                      {format(new Date(upcomingInterview.scheduled_at), "EEE, MMM d · h:mm a")}
                    </div>
                    <div className="mt-2 text-sm text-white/70">{upcomingInterview.timezone || "Local timezone"}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-muted p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> Location / Link
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {upcomingInterview.mode === "offline" ? (upcomingInterview.location || "Recruiter location will be shared") : (upcomingInterview.meeting_link || "Meeting link will be shared")}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <MessageSquareQuote className="h-3.5 w-3.5" /> Round type
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">{upcomingInterview.interview_type}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold text-foreground">Pre-interview checklist</h4>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Keep your resume, portfolio, and project links ready.</li>
                      <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Test your camera, mic, and internet if this is online.</li>
                      <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Carry any requested documents or IDs if offline.</li>
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={confirmInterview} disabled={isLoading}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm attendance
                    </Button>
                    <Button variant="outline" onClick={() => openReschedule(upcomingInterview.id)}>
                      <Calendar className="mr-2 h-4 w-4" /> Request reschedule
                    </Button>
                    <Button variant="outline" onClick={() => addToCalendar(upcomingInterview)}>
                      <Download className="mr-2 h-4 w-4" /> Add to calendar
                    </Button>
                    {upcomingInterview.meeting_link && (
                      <Button asChild variant="outline">
                        <a href={upcomingInterview.meeting_link} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" /> Open link
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-gradient-to-br from-fuchsia-50 to-violet-50 p-4 text-violet-900">
                    <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Notification timeline</div>
                    <div className="mt-3 space-y-3">
                      {interviewTimeline.map((item) => (
                        <div key={item.label} className="flex items-start gap-3">
                          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-600" />
                          <div>
                            <div className="text-sm font-semibold">{item.label}</div>
                            <div className="text-xs text-violet-700/80">{item.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" /> Trust signal
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      Decision expected by <span className="font-semibold">{decisionWindow}</span>.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">If the timeline slips, the recruiter should update the slot instead of leaving you guessing.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-[1.75rem] border border-border bg-card p-8 text-center shadow-card">
              <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No upcoming interview yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Once shortlisted, the recruiter will schedule your interview here.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card">
            <h3 className="text-lg font-semibold text-foreground">Shortlisted roles</h3>
            <p className="mt-1 text-sm text-muted-foreground">The roles currently carrying your shortlist status.</p>
            <div className="mt-4 space-y-3">
              {shortlistedApps.length === 0 ? (
                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">No shortlisted applications right now.</div>
              ) : (
                shortlistedApps.map((app) => {
                  const job = jobs.find((item) => item.id === app.job_id);
                  return (
                    <div key={app.id} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-foreground">{job?.title || app.role}</div>
                          <div className="text-xs text-muted-foreground">{job?.department || "Team"} · {job?.location || app.location}</div>
                        </div>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{app.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card">
            <h3 className="text-lg font-semibold text-foreground">What to do next</h3>
            <div className="mt-4 space-y-3">
              {[
                "Confirm the interview once the schedule works for you.",
                "If needed, request a new slot with your reason and availability.",
                "Keep the calendar synced so reminders stay accurate.",
                "Watch the timeline for reminders and recruiter updates.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a new interview slot</DialogTitle>
            <DialogDescription>Give the recruiter a clear reason and a few preferred windows.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Reason</label>
              <Textarea value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} placeholder="Explain why this slot doesn't work" className="min-h-[110px] rounded-2xl" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Preferred slots</label>
              <Textarea value={preferredSlots} onChange={(e) => setPreferredSlots(e.target.value)} placeholder={"Tue 11:00 AM\nWed 2:00 PM\nThu 4:30 PM"} className="min-h-[120px] rounded-2xl" />
              <p className="mt-1 text-xs text-muted-foreground">One slot per line. This gets sent to the recruiter as your preferred options.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button onClick={saveReschedule}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default CandidateShortlisted;
