import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Sparkles, Target, TrendingUp, FileUp, BadgeCheck } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { getATSScore, listResumes, refreshResumeATS, uploadResume } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useStore } from "@/stores/useStore";
import { Link } from "react-router-dom";

interface ATSResult {
  job_id: number;
  job_title: string;
  department: string;
  location: string;
  ats_score: number;
  verdict: "excellent_fit" | "good_fit" | "needs_improvement";
  matched_skills: string[];
  missing_skills: string[];
  score_breakdown: {
    skills_match: number;
    experience_fit: number;
    keyword_relevance: number;
    profile_completeness: number;
    education_certifications: number;
  };
  insights: {
    strengths: string[];
    improvements: string[];
  };
}

interface ATSResponse {
  average_score: number;
  total_jobs_evaluated: number;
  top_recommendations: string[];
  results: ATSResult[];
}

interface StoredResume {
  id: number;
  title: string;
  file_name?: string;
  file_url?: string;
  ats_score?: number;
  is_primary?: boolean;
}

const ATSScore = () => {
  const { jobs, loadJobs } = useStore();
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [atsData, setAtsData] = useState<ATSResponse | null>(null);
  const [scanResult, setScanResult] = useState<{ resume_id: number; ats_score: number; is_ats_optimized: boolean } | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");
  const [storedResumes, setStoredResumes] = useState<StoredResume[]>([]);

  const loadStoredResumes = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      setResumesLoading(true);
      const data = await listResumes(token);
      const mapped = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        file_name: item.file_name,
        file_url: item.file_url,
        ats_score: item.ats_score,
        is_primary: item.is_primary,
      }));
      setStoredResumes(mapped);
      if (!selectedResumeId && mapped.length > 0) {
        setSelectedResumeId(String(mapped[0].id));
      }
    } catch (error: any) {
      toast({ title: "Failed to load resumes", description: error.message, variant: "destructive" });
    } finally {
      setResumesLoading(false);
    }
  };

  useEffect(() => {
    const loadInitial = async () => {
      try {
        await loadJobs();
        await loadStoredResumes();
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [loadJobs]);

  const runSummary = async () => {
    try {
      setSummaryLoading(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const data = await getATSScore(token, jobId ? Number(jobId) : undefined);
      setAtsData(data);
    } catch (error: any) {
      toast({ title: "Failed to load ATS insights", description: error.message || "Could not calculate ATS score", variant: "destructive" });
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      runSummary();
    }
    // jobId intentionally drives the live ATS matrix refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, loading]);

  const handleUploadResume = async () => {
    if (!resumeFile) {
      toast({ title: "Select a resume", description: "Upload a PDF or DOC file first.", variant: "destructive" });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setAnalysisRunning(true);
      const uploaded = await uploadResume(token, resumeFile, resumeFile.name.replace(/\.[^.]+$/, ""), true);
      setSelectedResumeId(String(uploaded.id));
      await loadStoredResumes();
      toast({ title: "Resume uploaded", description: "Choose a job role and run live scan next." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setAnalysisRunning(false);
    }
  };

  const handleRunLiveScan = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let resumeId = selectedResumeId;
    if (!resumeId && resumeFile) {
      try {
        setAnalysisRunning(true);
        const uploaded = await uploadResume(token, resumeFile, resumeFile.name.replace(/\.[^.]+$/, ""), true);
        resumeId = String(uploaded.id);
        setSelectedResumeId(resumeId);
        await loadStoredResumes();
      } catch (error: any) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        setAnalysisRunning(false);
        return;
      }
    }

    if (!resumeId) {
      toast({ title: "Choose a resume", description: "Upload a new resume or pick one you already added.", variant: "destructive" });
      return;
    }

    try {
      setAnalysisRunning(true);
      const result = await refreshResumeATS(token, resumeId, jobId ? Number(jobId) : undefined);
      setScanResult(result);
      await loadStoredResumes();
      await runSummary();
      toast({ title: "Live ATS scan complete", description: `Resume score updated to ${Math.round(result.ats_score)}.` });
    } catch (error: any) {
      toast({ title: "Live ATS scan failed", description: error.message, variant: "destructive" });
    } finally {
      setAnalysisRunning(false);
    }
  };

  const jobScores = useMemo(() => atsData?.results || [], [atsData]);
  const avgScore = atsData?.average_score || 0;

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading ATS workspace...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ATS Score</h1>
          <p className="text-muted-foreground mt-1">Upload a resume, pick a job role, and run the live API scan.</p>
        </div>
        <Link to="/candidate/resume" className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-card hover-lift">
          Open Resume Builder
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.75rem] border border-border bg-gradient-to-br from-white via-violet-50/35 to-white p-6 shadow-card">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-violet-700" />
            <h2 className="text-lg font-semibold text-foreground">Live resume scan</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Upload or choose an existing resume, then run a real ATS refresh against the selected role.</p>

          <div className="mt-5 grid gap-3">
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} className="rounded-xl bg-muted px-4 py-2.5 text-sm outline-none" />
            <div className="grid gap-3 md:grid-cols-2">
              <select value={selectedResumeId} onChange={(e) => setSelectedResumeId(e.target.value)} className="rounded-xl bg-muted px-4 py-2.5 text-sm outline-none border-0 text-foreground disabled:opacity-60" disabled={resumesLoading}>
                <option value="">Select uploaded resume</option>
                {storedResumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>{resume.title}{resume.is_primary ? " · primary" : ""}{resume.ats_score ? ` · ${Math.round(resume.ats_score)}%` : ""}</option>
                ))}
              </select>
              <select value={jobId} onChange={(e) => setJobId(e.target.value)} disabled={summaryLoading} className="rounded-xl bg-muted px-4 py-2.5 text-sm outline-none border-0 text-foreground disabled:opacity-60">
                <option value="">All active jobs</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title} (#{job.id})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleUploadResume} disabled={analysisRunning} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60">
                <FileUp className="w-4 h-4" /> Upload Resume
              </button>
              <button onClick={handleRunLiveScan} disabled={analysisRunning} className="gradient-primary rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {analysisRunning ? "Running scan..." : "Run Live ATS Scan"}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BadgeCheck className="w-3.5 h-3.5" /> API-backed behavior
            </div>
            <p className="mt-2 text-sm text-muted-foreground">This page uses the real resume upload endpoint and the live ATS refresh endpoint. No fake local scoring is used for the scan action.</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-700" />
            <h2 className="text-lg font-semibold text-foreground">Latest live result</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">ATS Score</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{scanResult ? `${Math.round(scanResult.ats_score)}%` : "-"}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">Optimized</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{scanResult ? (scanResult.is_ats_optimized ? "Yes" : "No") : "-"}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">Jobs evaluated</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{atsData?.total_jobs_evaluated || 0}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-violet-50/60 p-4 text-sm text-violet-900">
            {scanResult ? `Resume ${scanResult.resume_id} scored ${Math.round(scanResult.ats_score)} in the live ATS refresh.` : "Upload a resume and run the live scan to populate this card."}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5" />
            Summary score uses the live ATS analytics endpoint for the selected role context.
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-[1.75rem] border border-border bg-gradient-to-br from-white via-violet-50/35 to-white p-8 shadow-card">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary bg-white shadow-card">
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">{avgScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Match</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Evaluated Jobs</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{atsData?.total_jobs_evaluated || 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Top Recommendation</p>
              <p className="mt-1 text-sm font-semibold text-foreground line-clamp-1">{atsData?.top_recommendations[0] || "No role match yet"}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Signal</p>
              <p className="mt-1 text-sm font-semibold text-violet-700">Live API scan</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 space-y-4">
        {jobScores.map((item, i) => (
          <motion.div key={item.job_id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{item.job_title}</h3>
                <p className="text-sm text-muted-foreground">{item.department} · {item.location}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${item.ats_score >= 70 ? "bg-emerald-50 text-emerald-600" : item.ats_score >= 40 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                {item.ats_score}%
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div initial={{ width: 0 }} animate={{ width: `${item.ats_score}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full rounded-full gradient-primary" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-xs md:grid-cols-5">
              <div className="rounded-lg bg-muted px-2 py-2">Skills {item.score_breakdown.skills_match}</div>
              <div className="rounded-lg bg-muted px-2 py-2">Exp {item.score_breakdown.experience_fit}</div>
              <div className="rounded-lg bg-muted px-2 py-2">Keywords {item.score_breakdown.keyword_relevance}</div>
              <div className="rounded-lg bg-muted px-2 py-2">Profile {item.score_breakdown.profile_completeness}</div>
              <div className="rounded-lg bg-muted px-2 py-2">Edu/Cert {item.score_breakdown.education_certifications}</div>
            </div>
            <div className="mt-3 flex gap-4 flex-wrap">
              <div>
                <p className="mb-1 text-xs font-semibold text-emerald-600">Matched</p>
                <div className="flex flex-wrap gap-1">
                  {item.matched_skills.map((s) => <span key={s} className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">{s}</span>)}
                  {item.matched_skills.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-red-500">Missing</p>
                <div className="flex flex-wrap gap-1">
                  {item.missing_skills.map((s) => <span key={s} className="rounded-lg bg-red-50 px-2 py-0.5 text-xs text-red-500">{s}</span>)}
                  {item.missing_skills.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-emerald-700"><Sparkles className="w-3.5 h-3.5" /> AI strengths</p>
                <ul className="space-y-1 text-xs text-emerald-800">
                  {item.insights.strengths.map((line, idx) => <li key={idx}>• {line}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-700"><Target className="w-3.5 h-3.5" /> AI improvements</p>
                <ul className="space-y-1 text-xs text-amber-800">
                  {item.insights.improvements.map((line, idx) => <li key={idx}>• {line}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              Scoring updates are fetched from the backend for the selected job context.
            </div>
          </motion.div>
        ))}
      </div>
    </PageLayout>
  );
};

export default ATSScore;
