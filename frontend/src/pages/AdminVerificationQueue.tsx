import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Building2, CalendarClock, ShieldAlert, Users } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { getVerificationQueue, reviewVerificationSubmission } from "@/services/api";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";

const AdminVerificationQueue = () => {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState<Record<number, { verification_level: string; trust_score: number; admin_notes: string }>>({});

  useEffect(() => {
    const loadQueue = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");
        const data = await getVerificationQueue(token);
        setQueue(data);
        setReviewForm(
          data.reduce((acc: Record<number, { verification_level: string; trust_score: number; admin_notes: string }>, item: any) => {
            acc[item.recruiter_id] = {
              verification_level: item.verification_level || "basic",
              trust_score: Number(item.trust_score || 0),
              admin_notes: item.admin_notes || "",
            };
            return acc;
          }, {}),
        );
      } catch (error: any) {
        toast({ title: "Could not load verification queue", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadQueue();
  }, []);

  const applyReview = async (item: any, action: "approve" | "reject") => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    const config = reviewForm[item.recruiter_id] || {
      verification_level: item.verification_level,
      trust_score: item.trust_score,
      admin_notes: "",
    };

    setSubmittingId(item.recruiter_id);
    try {
      const updated = await reviewVerificationSubmission(token, item.recruiter_id, {
        action,
        verification_level: config.verification_level,
        trust_score: Number(config.trust_score),
        admin_notes: config.admin_notes,
      });

      setQueue((prev) => prev.map((entry) => (entry.recruiter_id === item.recruiter_id ? updated : entry)));
      toast({ title: action === "approve" ? "Submission approved" : "Submission rejected" });
    } catch (error: any) {
      toast({ title: "Review update failed", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingId(null);
    }
  };

  const stats = useMemo(() => ({
    total: queue.length,
    verified: queue.filter((item) => item.verification_level === "verified" || item.verification_level === "trusted").length,
    basic: queue.filter((item) => item.verification_level === "basic").length,
    flagged: queue.filter((item) => item.reports_count > 0 || item.trust_score < 55).length,
  }), [queue]);

  if (user.role !== "admin") {
    return (
      <PageLayout>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">This queue is only visible to admins.</p>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading verification queue...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="rounded-[2rem] border border-border bg-gradient-to-br from-white via-violet-50/35 to-white p-8 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              <BadgeCheck className="h-3.5 w-3.5" /> Admin verification queue
            </div>
            <h1 className="mt-4 text-3xl font-bold text-foreground">Recruiter company submissions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              This is where admins can review the recruiter/company verification requests and check live trust data before allowing stronger posting privileges.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total", value: stats.total },
              { label: "Verified", value: stats.verified },
              { label: "Basic", value: stats.basic },
              { label: "Flagged", value: stats.flagged },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 text-center shadow-card">
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {queue.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card text-sm text-muted-foreground">No company verification submissions yet.</div>
        ) : (
          queue.map((item, index) => {
            const levelClass = item.verification_level === "trusted" ? "bg-emerald-50 text-emerald-700" : item.verification_level === "verified" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-700";
            return (
              <motion.div key={item.recruiter_id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-foreground">{item.company_name}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelClass}`}>{item.verification_level}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.recruiter_name} · {item.recruiter_email}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Domain: {item.company_domain || "Not shared"}</p>
                    <p className="text-sm text-muted-foreground">Website: {item.website_url || "Not shared"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[32rem]">
                    {[
                      { label: "Trust", value: `${item.trust_score}/100` },
                      { label: "Reports", value: item.reports_count },
                      { label: "Response", value: `${Math.round(item.response_rate)}%` },
                      { label: "Hiring", value: `${Math.round(item.hiring_success_rate)}%` },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-border bg-muted/35 p-4 text-center">
                        <div className="text-lg font-bold text-foreground">{stat.value}</div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-muted/35 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Building2 className="h-3.5 w-3.5" /> Registry</div>
                    <p className="mt-2 text-sm text-foreground">{item.business_registration_verified ? "Verified" : "Pending"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Business country: {item.business_country || "Not shared"}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/35 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Users className="h-3.5 w-3.5" /> Reports</div>
                    <p className="mt-2 text-sm text-foreground">Scam {item.scam_reports_count} · No-response {item.no_response_reports_count} · Fake job {item.fake_job_reports_count}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Review if reports look like abuse or a pattern.</p>
                  </div>
                  <div className="rounded-2xl bg-muted/35 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> Submission</div>
                    <p className="mt-2 text-sm text-foreground">{item.submitted_at ? new Date(item.submitted_at).toLocaleString() : new Date(item.created_at).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Status: {item.review_status}</p>
                  </div>
                </div>

                {item.review_status && ["approved", "rejected"].includes(item.review_status) ? (
                  <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review Complete</p>
                        <p className="mt-2 text-sm font-semibold text-foreground capitalize">{item.review_status === "approved" ? "✓ Approved" : "✗ Rejected"}</p>
                        {item.admin_notes && (
                          <p className="mt-2 text-xs text-muted-foreground max-w-md">{item.admin_notes}</p>
                        )}
                      </div>
                      <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.review_status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {item.review_status === "approved" ? "Verified" : "Needs Action"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin Review Controls</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground">Verification level</label>
                        <select
                          value={reviewForm[item.recruiter_id]?.verification_level ?? item.verification_level}
                          onChange={(e) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              [item.recruiter_id]: {
                                ...(prev[item.recruiter_id] || { trust_score: item.trust_score, admin_notes: "" }),
                                verification_level: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="basic">Basic</option>
                          <option value="verified">Verified</option>
                          <option value="trusted">Trusted</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground">Trust score</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={reviewForm[item.recruiter_id]?.trust_score ?? item.trust_score}
                          onChange={(e) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              [item.recruiter_id]: {
                                ...(prev[item.recruiter_id] || { verification_level: item.verification_level, admin_notes: "" }),
                                trust_score: Number(e.target.value),
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground">Admin notes</label>
                        <input
                          value={reviewForm[item.recruiter_id]?.admin_notes ?? ""}
                          onChange={(e) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              [item.recruiter_id]: {
                                ...(prev[item.recruiter_id] || { verification_level: item.verification_level, trust_score: item.trust_score }),
                                admin_notes: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                          placeholder="Optional feedback for recruiter"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => applyReview(item, "approve")}
                        disabled={submittingId === item.recruiter_id}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => applyReview(item, "reject")}
                        disabled={submittingId === item.recruiter_id}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </PageLayout>
  );
};

export default AdminVerificationQueue;
