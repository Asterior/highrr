import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Globe, ShieldCheck, BadgeCheck, MapPin, ArrowLeft, Briefcase, Mail, Users, MessageSquare } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import VerificationBadge from "@/components/VerificationBadge";
import { useStore } from "@/stores/useStore";
import { EmployerBadgeResponse, getCompanyTrust, getEmployerBadge } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const CandidateCompany = () => {
  const navigate = useNavigate();
  const { recruiterId } = useParams();
  const { jobs, loadJobs } = useStore();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [employerBadge, setEmployerBadge] = useState<EmployerBadgeResponse | null>(null);

  useEffect(() => {
    const loadCompany = async () => {
      if (!recruiterId) return;
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");
        await loadJobs();
        const data = await getCompanyTrust(token, recruiterId);
        setCompany(data);
        try {
          setEmployerBadge(await getEmployerBadge(Number(recruiterId)));
        } catch {
          setEmployerBadge(null);
        }
      } catch (error: any) {
        toast({ title: "Company profile unavailable", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, [loadJobs, recruiterId]);

  const relatedJobs = useMemo(() => jobs.filter((job) => String(job.created_by) === String(recruiterId)), [jobs, recruiterId]);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading company profile...</div>
      </PageLayout>
    );
  }

  if (!company) {
    return (
      <PageLayout>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <p className="text-muted-foreground">Company profile not found.</p>
          <button onClick={() => navigate(-1)} className="mt-4 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground">Go back</button>
        </div>
      </PageLayout>
    );
  }

  const trustColor =
    company.verification_level === "trusted"
      ? "text-emerald-700 bg-emerald-50"
      : company.verification_level === "verified"
        ? "text-violet-700 bg-violet-50"
        : "text-slate-700 bg-slate-100";

  return (
    <PageLayout>
      <div className="mb-6 flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-card hover-lift">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/candidate/messages?participantId=${recruiterId}`)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-card hover-lift"
          >
            <MessageSquare className="h-4 w-4" /> Message Recruiter
          </button>
          <button onClick={() => navigate("/candidate/jobs")} className="rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground">
            Browse more jobs
          </button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-white via-violet-50/40 to-white shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Candidate-visible company trust
            </div>
            <h1 className="mt-4 text-3xl font-bold text-foreground">{company.company_name}</h1>
            {employerBadge && (
              <div className="mt-2 flex items-center gap-2">
                <VerificationBadge
                  badgeLevel={employerBadge.badge_level}
                  checks={{
                    gst: employerBadge.gst_verified,
                    domain: employerBadge.domain_verified,
                    linkedin: employerBadge.linkedin_verified,
                  }}
                />
              </div>
            )}
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              This view is built for candidates to review a company before applying. The trust layer is live, API-backed, and updated by recruiter verification, reports, and posting behavior.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${trustColor}`}>{company.verification_level}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Trust score {company.trust_score}/100</span>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">Response rate {Math.round(company.response_rate)}%</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Hiring success {Math.round(company.hiring_success_rate)}%</span>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Building2 className="h-3.5 w-3.5" /> Domain</div>
                <p className="mt-2 text-sm font-medium text-foreground">{company.company_domain || "Not shared"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{company.domain_verified ? "Domain verified" : "Domain not verified"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Mail className="h-3.5 w-3.5" /> Contact</div>
                <p className="mt-2 text-sm font-medium text-foreground">{company.company_email || "Not shared"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Business registry: {company.business_registration_verified ? "Verified" : "Pending"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Globe className="h-3.5 w-3.5" /> Website</div>
                <p className="mt-2 text-sm font-medium text-foreground line-clamp-2">{company.website_url || "Not shared"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Website quality score {company.website_quality_score}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Users className="h-3.5 w-3.5" /> Presence</div>
                <p className="mt-2 text-sm font-medium text-foreground">Employee presence score {company.employee_presence_score}</p>
                <p className="mt-1 text-xs text-muted-foreground">Office proof {company.office_proof_verified ? "Verified" : "Not provided"}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-gradient-to-br from-[#1a1130] to-[#09090f] p-8 text-white lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              <BadgeCheck className="h-3.5 w-3.5" /> Live trust signals
            </div>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs text-white/60">Verified recruiter</p>
                <p className="mt-1 text-lg font-semibold text-white">{company.recruiter_name}</p>
                <p className="text-sm text-white/70">{company.recruiter_email}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs text-white/60">Live status</p>
                <p className="mt-1 text-lg font-semibold text-white capitalize">{company.review_status}</p>
                <p className="text-sm text-white/70">Last assessed {company.last_assessed_at ? new Date(company.last_assessed_at).toLocaleString() : "not yet assessed"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs text-white/60">What this means</p>
                <p className="mt-1 text-sm leading-6 text-white/75">
                  Candidates can use this page to judge whether a company is real, responsive, and active before applying.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Open roles from this company</h2>
            <p className="text-sm text-muted-foreground">Jobs posted by this recruiter.</p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-accent-foreground">{relatedJobs.length} jobs</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {relatedJobs.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground md:col-span-2">No active jobs were found for this company yet.</div>
          ) : (
            relatedJobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.department} · {job.location}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">{job.job_type}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                <button onClick={() => navigate(`/candidate/jobs`)} className="mt-3 text-sm font-semibold text-violet-700 hover:underline">
                  View in jobs list
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default CandidateCompany;
