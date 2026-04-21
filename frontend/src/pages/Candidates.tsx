import { useState, useEffect, useMemo } from "react";
import { Search, MessageSquare, Eye, ArrowRight, CalendarClock, Download, Mail, Phone, MapPin, GraduationCap, Briefcase, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getCandidateProfileByUser } from "@/services/api";

const Candidates = () => {
  const { applications, jobs, loadApplications, updateApplicationStatus, startConversation, isLoading } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All");
  const [skillFilter, setSkillFilter] = useState("All");
  const [expFilter, setExpFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [educationFilter, setEducationFilter] = useState("All");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  useEffect(() => {
    const loadAppData = async () => {
      try {
        setLoadingMessage("Loading candidates...");
        await loadApplications();
        setLoadingMessage("");
      } catch (error) {
        console.error("Error loading applications:", error);
        toast({ title: "Error", description: "Failed to load candidates from database", variant: "destructive" });
        setLoadingMessage("");
      }
    };
    loadAppData();
  }, [loadApplications]);

  const allSkills = [...new Set(applications.flatMap((a) => a.skills))];
  const allLocations = [...new Set(applications.map((a) => a.candidate_location || a.location || "Unknown"))];
  const allQualifications = [...new Set(applications.map((a) => a.highest_qualification || "Not specified"))];

  const filtered = applications.filter((c) => {
    const matchSearch = c.candidate_name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase());
    const matchJob = jobFilter === "All" || c.job_id === jobFilter;
    const matchSkill = skillFilter === "All" || c.skills.includes(skillFilter);
    const matchExp = expFilter === "All" || (expFilter === "0-2" && c.experience_years <= 2) || (expFilter === "3-5" && c.experience_years >= 3 && c.experience_years <= 5) || (expFilter === "5+" && c.experience_years > 5);
    const matchLocation = locationFilter === "All" || (c.candidate_location || c.location || "Unknown") === locationFilter;
    const matchEducation = educationFilter === "All" || (c.highest_qualification || "Not specified") === educationFilter;
    return matchSearch && matchJob && matchSkill && matchExp && matchLocation && matchEducation;
  });

  const shortlistCount = useMemo(() => applications.filter((a) => a.status === "shortlisted").length, [applications]);

  const openCandidate = async (candidate: any) => {
    setSelectedCandidate(candidate);
    setSelectedProfile(null);
    try {
      setDrawerLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;
      const profile = await getCandidateProfileByUser(token, candidate.user_id);
      setSelectedProfile(profile);
    } catch {
      setSelectedProfile(null);
    } finally {
      setDrawerLoading(false);
    }
  };

  // FIX: create or find conversation then navigate with ?conversation=id
  const handleMessage = async (candidate: any) => {
    if (!candidate.user_id) {
      toast({ title: "Cannot message", description: "Candidate user ID not found.", variant: "destructive" });
      return;
    }
    setMessagingId(candidate.id);
    try {
      const convId = await startConversation(Number(candidate.user_id));
      if (convId) {
        navigate(`/messages?conversation=${convId}`);
      } else {
        toast({ title: "Error", description: "Could not start conversation.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to open conversation.", variant: "destructive" });
    } finally {
      setMessagingId(null);
    }
  };

  const handleShortlist = async (id: string) => {
    try {
      const success = await updateApplicationStatus(id, "shortlisted");
      if (success) {
        toast({ title: "Shortlisted", description: "Candidate has been shortlisted." });
      } else {
        toast({ title: "Cannot shortlist", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error shortlisting candidate:", error);
      toast({ title: "Error", description: "Failed to shortlist candidate", variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const success = await updateApplicationStatus(id, "rejected");
      if (success) {
        toast({ title: "Rejected", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error rejecting candidate:", error);
      toast({ title: "Error", description: "Failed to reject candidate", variant: "destructive" });
    }
  };

  const statusLabel = (status: string) => (status === "selected" ? "hired" : status);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Candidates</h1>
          <p className="text-muted-foreground mt-1">{applications.length} candidates in pipeline · {shortlistCount} shortlisted</p>
        </div>
        <Link to="/shortlisted" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 transition-opacity">
          <CalendarClock className="w-4 h-4" /> Open shortlist workspace
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground" />
        </div>
        <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="px-3 py-2.5 bg-muted rounded-xl text-sm outline-none">
          <option value="All">All Jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} className="px-3 py-2.5 bg-muted rounded-xl text-sm outline-none">
          <option value="All">All Skills</option>
          {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={expFilter} onChange={(e) => setExpFilter(e.target.value)} className="px-3 py-2.5 bg-muted rounded-xl text-sm outline-none">
          <option value="All">All Experience</option>
          <option value="0-2">0–2 years</option>
          <option value="3-5">3–5 years</option>
          <option value="5+">5+ years</option>
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="px-3 py-2.5 bg-muted rounded-xl text-sm outline-none">
          <option value="All">All Locations</option>
          {allLocations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={educationFilter} onChange={(e) => setEducationFilter(e.target.value)} className="px-3 py-2.5 bg-muted rounded-xl text-sm outline-none">
          <option value="All">All Education</option>
          {allQualifications.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-card hover-lift"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {c.candidate_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.candidate_name}</p>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-secondary text-accent-foreground text-xs font-bold">{c.score}%</div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.status === "selected" ? "bg-emerald-50 text-emerald-600" : c.status === "rejected" ? "bg-red-50 text-red-500" : c.status === "interview" ? "bg-blue-50 text-blue-600" : "bg-secondary text-accent-foreground"}`}>{statusLabel(c.status)}</span>
              <span className="text-xs text-muted-foreground">{c.experience_years}y exp</span>
              {c.candidate_location && <span className="text-xs text-muted-foreground">{c.candidate_location}</span>}
              {c.highest_qualification && <span className="text-xs text-muted-foreground">{c.highest_qualification}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {c.skills.map((s) => <span key={s} className="px-2.5 py-1 bg-muted rounded-lg text-xs text-muted-foreground font-medium">{s}</span>)}
            </div>
            <div className="flex gap-2 mt-5 flex-wrap">
              <button onClick={() => openCandidate(c)} className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary text-accent-foreground rounded-xl text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
                <Eye className="w-4 h-4" /> Review
              </button>
              {c.resume_url && (
                <a href={c.resume_url} target="_blank" rel="noreferrer" className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                  <Download className="w-4 h-4" /> Resume
                </a>
              )}
              {c.status === "applied" && (
                <button onClick={() => handleShortlist(c.id)} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 gradient-primary text-primary-foreground rounded-xl text-sm font-medium hover-lift disabled:opacity-50">
                  <ArrowRight className="w-4 h-4" /> Shortlist
                </button>
              )}
              {c.status !== "rejected" && c.status !== "selected" && (
                <button onClick={() => handleReject(c.id)} disabled={isLoading} className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50">
                  Reject
                </button>
              )}
              {/* FIX: was <Link to="/messages"> — now starts/finds conversation first */}
              <button
                onClick={() => handleMessage(c)}
                disabled={messagingId === c.id}
                className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors flex items-center disabled:opacity-50"
              >
                {messagingId === c.id
                  ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <MessageSquare className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <Sheet open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <SheetContent className="w-[min(100vw,42rem)] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedCandidate?.candidate_name || "Candidate review"}</SheetTitle>
            <SheetDescription>
              Direct review of profile, resume, and contact details pulled from the live API.
            </SheetDescription>
          </SheetHeader>

          {selectedCandidate && (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-border bg-gradient-to-br from-white via-violet-50/35 to-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{selectedCandidate.candidate_name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{selectedCandidate.current_role || selectedCandidate.role || "Role not shared"} · {selectedCandidate.current_company || "Open to opportunities"}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-accent-foreground">{selectedCandidate.score}% match</span>
                      <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">{selectedCandidate.profile_completion_percentage || 0}% profile</span>
                      {selectedCandidate.highest_qualification && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{selectedCandidate.highest_qualification}</span>}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-muted/40 px-4 py-3 text-right">
                    <div className="text-xs text-muted-foreground">Location</div>
                    <div className="text-sm font-semibold text-foreground">{selectedCandidate.candidate_location || selectedCandidate.location || "Unknown"}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Mail className="w-3.5 h-3.5" /> Email</div>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedCandidate.candidate_email}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Phone className="w-3.5 h-3.5" /> Contact</div>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedProfile?.phone || selectedCandidate.phone || "Not shared"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><MapPin className="w-3.5 h-3.5" /> Location</div>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedProfile?.current_location || selectedCandidate.candidate_location || selectedCandidate.location || "Not shared"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><GraduationCap className="w-3.5 h-3.5" /> Education</div>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedProfile?.highest_qualification || selectedCandidate.highest_qualification || "Not shared"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Briefcase className="w-3.5 h-3.5" /> Resume and profile signals</div>
                <div className="mt-3 space-y-2 text-sm text-foreground">
                  <p>Experience: {selectedCandidate.experience_years} years</p>
                  <p>Skills: {selectedCandidate.skills.join(", ") || "Not shared"}</p>
                  <p>Profile completeness: {selectedCandidate.profile_completion_percentage || 0}%</p>
                  {selectedProfile?.bio && <p className="text-muted-foreground leading-6">{selectedProfile.bio}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedCandidate.resume_url && (
                  <a href={selectedCandidate.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                    <Download className="w-4 h-4" /> Open resume
                  </a>
                )}
                {selectedCandidate.candidate_email && (
                  <a href={`mailto:${selectedCandidate.candidate_email}`} className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground">
                    <Mail className="w-4 h-4" /> Email candidate
                  </a>
                )}
              </div>

              {drawerLoading && <p className="text-sm text-muted-foreground">Loading live profile details...</p>}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {applications.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No candidates found. They will appear here when someone applies to your jobs.</p>
        </div>
      )}

      {filtered.length === 0 && applications.length > 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No candidates match your filters. Try adjusting your search criteria.</p>
        </div>
      )}
    </PageLayout>
  );
};

export default Candidates;