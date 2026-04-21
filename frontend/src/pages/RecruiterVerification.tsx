import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Building2, Globe, BadgeCheck, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import {
  assessCompanyVerification,
  getRecruiterVerificationProfile,
  getRecruiterVerificationStatus,
  unlockCompanyVerificationProfile,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type VerificationForm = {
  company_name: string;
  company_email: string;
  company_domain: string;
  website_url: string;
  business_registry_id: string;
  business_country: string;
  domain_age_years: number;
  has_https: boolean;
  contact_matches_submission: boolean;
  office_proof_verified: boolean;
  linkedin_company_url: string;
  employee_count: number;
  user_reports_penalty: number;
};

const RecruiterVerification = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [status, setStatus] = useState<{
    verification_level: string;
    trust_score: number;
    review_status: string;
    is_locked: boolean;
    admin_notes?: string | null;
  } | null>(null);

  const [form, setForm] = useState<VerificationForm>({
    company_name: "",
    company_email: "",
    company_domain: "",
    website_url: "",
    business_registry_id: "",
    business_country: "India",
    domain_age_years: 0,
    has_https: true,
    contact_matches_submission: true,
    office_proof_verified: false,
    linkedin_company_url: "",
    employee_count: 0,
    user_reports_penalty: 0,
  });

  const badge = useMemo(() => {
    if (!status) return { label: "Basic", className: "bg-slate-100 text-slate-700" };
    if (status.verification_level === "trusted") return { label: "Trusted", className: "bg-emerald-100 text-emerald-700" };
    if (status.verification_level === "verified") return { label: "Verified", className: "bg-violet-100 text-violet-700" };
    return { label: "Basic", className: "bg-slate-100 text-slate-700" };
  }, [status]);

  const loadStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const [statusData, profileData] = await Promise.all([
        getRecruiterVerificationStatus(token),
        getRecruiterVerificationProfile(token),
      ]);
      setStatus(statusData);
      setForm((prev) => ({
        ...prev,
        company_name: profileData.company_name || "",
        company_email: profileData.company_email || "",
        company_domain: profileData.company_domain || "",
        website_url: profileData.website_url || "",
        business_registry_id: profileData.business_registry_id || "",
        business_country: profileData.business_country || "India",
        domain_age_years: Number(profileData.domain_age_years || 0),
        has_https: Boolean(profileData.has_https),
        contact_matches_submission: Boolean(profileData.contact_matches_submission),
        office_proof_verified: Boolean(profileData.office_proof_verified),
        linkedin_company_url: profileData.linkedin_company_url || "",
        employee_count: Number(profileData.employee_count || 0),
        user_reports_penalty: Number(profileData.user_reports_penalty || 0),
      }));
    } catch (error: any) {
      toast({ title: "Verification check failed", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await loadStatus();
      setLoading(false);
    };
    run();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status?.is_locked) {
      toast({ title: "Profile is locked", description: "Press Edit to update and resubmit for review." });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        domain_age_years: Number(form.domain_age_years || 0),
        employee_count: Number(form.employee_count || 0),
        user_reports_penalty: Number(form.user_reports_penalty || 0),
      };
      await assessCompanyVerification(token, payload);
      await loadStatus();
      toast({ title: "Saved for review", description: "Your profile is now locked until admin review or until you press Edit." });
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setUnlocking(true);
    try {
      await unlockCompanyVerificationProfile(token);
      await loadStatus();
      setShowEditConfirm(false);
      toast({ title: "Editing enabled", description: "You can now update details and save for review again." });
    } catch (error: any) {
      toast({ title: "Unlock failed", description: error.message, variant: "destructive" });
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading verification status...</div>;
  }

  const isApproved = status?.review_status === "approved";
  const isRejected = status?.review_status === "rejected";
  const isPendingReview = status?.review_status === "pending_review";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-cyan-50/30 p-6 md:p-10">
      <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between">
        <Link
          to={isApproved ? "/" : "/login"}
          className="inline-flex items-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted transition-colors"
        >
          {isApproved ? "← Go to Home" : "← Back to Login"}
        </Link>
      </div>
      {status?.is_locked && (
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto mb-6 flex items-center justify-end">
          <button
            onClick={() => setShowEditConfirm(true)}
            disabled={unlocking}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
          >
            ✏ Edit Profile
          </button>
        </motion.div>
      )}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isApproved && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="text-3xl">✓</div>
              <div>
                <h2 className="text-lg font-bold text-emerald-900">Profile Verified</h2>
                <p className="text-sm text-emerald-800">Your company verification has been approved. You can now post jobs and access all recruiter features.</p>
              </div>
            </div>
          </motion.div>
        )}
        {isRejected && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 bg-gradient-to-r from-rose-50 to-rose-100 border border-rose-200 rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚠</div>
              <div>
                <h2 className="text-lg font-bold text-rose-900">Profile Needs Updates</h2>
                <p className="text-sm text-rose-800">Your submission was rejected. Please review the admin feedback below and update your profile details to resubmit.</p>
              </div>
            </div>
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 bg-card rounded-2xl border border-border p-6 shadow-card">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-violet-600" />
            <h1 className="text-xl font-bold text-foreground">Company Trust Layer</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Only verified recruiters can access job posting and recruitment operations.</p>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Current Level</p>
              <p className={`mt-1 inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>{badge.label}</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Trust Score</p>
              <p className="mt-1 text-lg font-bold text-foreground">{status?.trust_score ?? 0}/100</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Review State</p>
              <p className="mt-1 text-sm font-semibold text-foreground capitalize">{(status?.review_status || "draft").replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">{status?.is_locked ? "Locked" : "Editable"}</p>
            </div>
            {!!status?.admin_notes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-700">Admin Notes</p>
                <p className="mt-1 text-xs text-amber-800 whitespace-pre-wrap">{status.admin_notes}</p>
              </div>
            )}
          </div>

          <div className="mt-6 text-xs text-muted-foreground space-y-2">
            <p className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Business identity and registry validation</p>
            <p className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Domain/email ownership and website quality checks</p>
            <p className="flex items-center gap-2"><BadgeCheck className="w-3.5 h-3.5" /> Continuous behavior-based trust scoring</p>
          </div>
        </motion.div>

        {isApproved ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="lg:col-span-2 bg-card rounded-2xl border border-emerald-200 shadow-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Verified Information</h2>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
              <p className="font-semibold text-emerald-900 mb-2">✓ Your profile is verified and locked</p>
              <p>Your company information is approved and cannot be edited until you request changes. To modify any details, click the Edit button above.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">Company Name</p>
                <p className="text-sm font-medium text-foreground">{form.company_name || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">Company Email</p>
                <p className="text-sm font-medium text-foreground">{form.company_email || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">Company Domain</p>
                <p className="text-sm font-medium text-foreground">{form.company_domain || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">Website URL</p>
                <p className="text-sm font-medium text-foreground break-all">{form.website_url || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">Business Registry ID</p>
                <p className="text-sm font-medium text-foreground">{form.business_registry_id || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">Business Country</p>
                <p className="text-sm font-medium text-foreground">{form.business_country || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">Domain Age (years)</p>
                <p className="text-sm font-medium text-foreground">{form.domain_age_years || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">Employee Count</p>
                <p className="text-sm font-medium text-foreground">{form.employee_count || "—"}</p>
              </div>
              <div className="md:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">LinkedIn Company URL</p>
                <p className="text-sm font-medium text-foreground break-all">{form.linkedin_company_url || "—"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.has_https} disabled className="cursor-not-allowed" />
                <label className="text-foreground">HTTPS enabled</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.contact_matches_submission} disabled className="cursor-not-allowed" />
                <label className="text-foreground">Contact details match submission</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.office_proof_verified} disabled className="cursor-not-allowed" />
                <label className="text-foreground">Office proof verified</label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
              <div className="text-sm font-semibold text-emerald-700 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">✓ Profile Verified</div>
            </div>
          </motion.div>
        ) : (
          <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} onSubmit={handleSubmit} className={`lg:col-span-2 bg-card rounded-2xl border shadow-card space-y-4 p-6 ${isRejected ? "border-rose-200" : "border-border"}`}>
            <h2 className="text-lg font-semibold text-foreground">Verification Details</h2>
            {isRejected && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {status?.admin_notes || "Your submission was rejected. Please update the details and resubmit."}
              </div>
            )}
            {status?.is_locked && !isApproved && !isRejected && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">
                This profile is locked awaiting admin review. Press Edit to make changes and resubmit.
              </div>
            )}
            {!isApproved && !isRejected && status?.is_locked && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Awaiting admin review. You'll receive an update once the review is complete.
              </div>
            )}
            <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 text-xs text-violet-800 space-y-1">
              <p><span className="font-semibold">Company Domain:</span> only the root domain name, like company.com (no https://, no /pages).</p>
              <p><span className="font-semibold">Website URL:</span> full public website link, like https://company.com/careers.</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${status?.is_locked ? "opacity-60 pointer-events-none" : ""}`}>
              <div>
                <label className="text-xs font-semibold text-foreground">Company Name</label>
                <input disabled={status?.is_locked} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Legal company name" className={`mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full ${status?.is_locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Company Email</label>
                <input disabled={status?.is_locked} value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} placeholder="name@company.com" className={`mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full ${status?.is_locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Company Domain</label>
                <input disabled={status?.is_locked} value={form.company_domain} onChange={(e) => setForm({ ...form, company_domain: e.target.value })} placeholder="example.com" className={`mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full ${status?.is_locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Website URL</label>
                <input disabled={status?.is_locked} value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://example.com" className={`mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full ${status?.is_locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Business Registry ID</label>
                <input disabled={status?.is_locked} value={form.business_registry_id} onChange={(e) => setForm({ ...form, business_registry_id: e.target.value })} placeholder="GST / CIN / registry id" className={`mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full ${status?.is_locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Business Country</label>
                <input disabled={status?.is_locked} value={form.business_country} onChange={(e) => setForm({ ...form, business_country: e.target.value })} placeholder="Country of registration" className={`mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full ${status?.is_locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Domain Age (years)</label>
                <input disabled={status?.is_locked} type="number" value={form.domain_age_years} onChange={(e) => setForm({ ...form, domain_age_years: Number(e.target.value) })} placeholder="How old is domain" className={`mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full ${status?.is_locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Employee Count</label>
                <input disabled={status?.is_locked} type="number" value={form.employee_count} onChange={(e) => setForm({ ...form, employee_count: Number(e.target.value) })} placeholder="Approx employee size" className={`mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full ${status?.is_locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-foreground">LinkedIn Company URL</label>
                <input disabled={status?.is_locked} value={form.linkedin_company_url} onChange={(e) => setForm({ ...form, linkedin_company_url: e.target.value })} placeholder="https://linkedin.com/company/..." className={`mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full ${status?.is_locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`} />
              </div>
            </div>
            <div className={`flex flex-wrap gap-4 text-sm text-foreground ${status?.is_locked ? "opacity-60 pointer-events-none" : ""}`}>
              <label className="inline-flex items-center gap-2 cursor-pointer"><input disabled={status?.is_locked} type="checkbox" checked={form.has_https} onChange={(e) => setForm({ ...form, has_https: e.target.checked })} className={status?.is_locked ? "cursor-not-allowed" : ""} /> HTTPS enabled</label>
              <label className="inline-flex items-center gap-2 cursor-pointer"><input disabled={status?.is_locked} type="checkbox" checked={form.contact_matches_submission} onChange={(e) => setForm({ ...form, contact_matches_submission: e.target.checked })} className={status?.is_locked ? "cursor-not-allowed" : ""} /> Contact details match submission</label>
              <label className="inline-flex items-center gap-2 cursor-pointer"><input disabled={status?.is_locked} type="checkbox" checked={form.office_proof_verified} onChange={(e) => setForm({ ...form, office_proof_verified: e.target.checked })} className={status?.is_locked ? "cursor-not-allowed" : ""} /> Office proof verified</label>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
              {status?.review_status === "draft" && !status?.is_locked && (
                <button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                  {submitting ? "Saving..." : "Save For Review"}
                </button>
              )}
              {isRejected && (
                <button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                  {submitting ? "Saving..." : "Resubmit"}
                </button>
              )}
              {isPendingReview && (
                <div className="text-sm font-semibold text-amber-700 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">⏳ Waiting for admin review...</div>
              )}
            </div>
          </motion.form>
        )}
      </div>

      <Dialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <DialogTitle>Unverify Profile?</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-foreground mt-2">
              Editing your profile will remove your current verification status. You'll need to resubmit for admin review and get re-verified before you can post jobs again.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <p><strong>What happens:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your verification will be unlocked for editing</li>
              <li>Your profile data will show in editable fields</li>
              <li>After making changes, you must click "Save For Review"</li>
              <li>Admin will review and approve/reject your updated submission</li>
            </ul>
          </div>
          <DialogFooter className="flex gap-2">
            <button onClick={() => setShowEditConfirm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {unlocking ? "Unlocking..." : "Yes, Edit Profile"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterVerification;
