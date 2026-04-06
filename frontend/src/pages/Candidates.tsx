import { useState, useEffect } from "react";
import { Search, MessageSquare, Eye, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

const Candidates = () => {
  const { applications, jobs, loadApplications, updateApplicationStatus, isLoading } = useStore();
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All");
  const [skillFilter, setSkillFilter] = useState("All");
  const [expFilter, setExpFilter] = useState("All");
  const [loadingMessage, setLoadingMessage] = useState("");

  // Load applications from API on component mount
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

  // Get unique skills from applications
  const allSkills = [...new Set(applications.flatMap((a) => a.skills))];

  // Filter candidates based on search and filter criteria
  const filtered = applications.filter((c) => {
    const matchSearch = c.candidate_name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase());
    const matchJob = jobFilter === "All" || c.job_id === jobFilter;
    const matchSkill = skillFilter === "All" || c.skills.includes(skillFilter);
    const matchExp = expFilter === "All" || (expFilter === "0-2" && c.experience_years <= 2) || (expFilter === "3-5" && c.experience_years >= 3 && c.experience_years <= 5) || (expFilter === "5+" && c.experience_years > 5);
    return matchSearch && matchJob && matchSkill && matchExp;
  });

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
      <h1 className="text-3xl font-bold text-foreground">Candidates</h1>
      <p className="text-muted-foreground mt-1">{applications.length} candidates in pipeline</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground" />
        </div>
        <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
          <option value="All">All Jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} className="bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
          <option value="All">All Skills</option>
          {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={expFilter} onChange={(e) => setExpFilter(e.target.value)} className="bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground">
          <option value="All">Any Experience</option>
          <option value="0-2">0-2 years</option>
          <option value="3-5">3-5 years</option>
          <option value="5+">5+ years</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
        {filtered.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bg-card rounded-2xl border border-border p-6 shadow-card hover-lift">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">{c.avatar}</div>
                <div>
                  <p className="font-semibold text-foreground">{c.candidate_name}</p>
                  <p className="text-sm text-muted-foreground">{c.role}</p>
                  <p className="text-xs text-muted-foreground">{c.candidate_email}</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-secondary text-accent-foreground text-xs font-bold">{c.score}%</div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.status === "selected" ? "bg-emerald-50 text-emerald-600" : c.status === "rejected" ? "bg-red-50 text-red-500" : c.status === "interview" ? "bg-blue-50 text-blue-600" : "bg-secondary text-accent-foreground"}`}>{c.status}</span>
              <span className="text-xs text-muted-foreground">{c.experience_years}y exp</span>
              {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
              {c.cgpa && <span className="text-xs text-muted-foreground">CGPA: {c.cgpa}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {c.skills.map((s) => <span key={s} className="px-2.5 py-1 bg-muted rounded-lg text-xs text-muted-foreground font-medium">{s}</span>)}
            </div>
            <div className="flex gap-2 mt-5">
              <Link to={`/candidates/${c.id}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary text-accent-foreground rounded-xl text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
                <Eye className="w-4 h-4" /> Profile
              </Link>
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
              <Link to="/messages" className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors flex items-center">
                <MessageSquare className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

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
