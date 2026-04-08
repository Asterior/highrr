import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Building2, Globe, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { assessCompanyVerification, getRecruiterVerificationStatus } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const RecruiterVerification = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ verification_level: string; trust_score: number } | null>(null);

  const [form, setForm] = useState({
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
      const data = await getRecruiterVerificationStatus(token);
      setStatus(data);
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
      toast({ title: "Verification evaluated", description: "Trust profile has been updated." });
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading verification status...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-cyan-50/30 p-6 md:p-10">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          </div>

          <div className="mt-6 text-xs text-muted-foreground space-y-2">
            <p className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Business identity and registry validation</p>
            <p className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Domain/email ownership and website quality checks</p>
            <p className="flex items-center gap-2"><BadgeCheck className="w-3.5 h-3.5" /> Continuous behavior-based trust scoring</p>
          </div>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} onSubmit={handleSubmit} className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-card space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Submit Verification Details</h2>
          <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 text-xs text-violet-800 space-y-1">
            <p><span className="font-semibold">Company Domain:</span> only the root domain name, like company.com (no https://, no /pages).</p>
            <p><span className="font-semibold">Website URL:</span> full public website link, like https://company.com/careers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Company Name</label>
              <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Legal company name" className="mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Company Email</label>
              <input value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} placeholder="name@company.com" className="mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Company Domain</label>
              <input value={form.company_domain} onChange={(e) => setForm({ ...form, company_domain: e.target.value })} placeholder="example.com" className="mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Website URL</label>
              <input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://example.com" className="mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Business Registry ID</label>
              <input value={form.business_registry_id} onChange={(e) => setForm({ ...form, business_registry_id: e.target.value })} placeholder="GST / CIN / registry id" className="mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Business Country</label>
              <input value={form.business_country} onChange={(e) => setForm({ ...form, business_country: e.target.value })} placeholder="Country of registration" className="mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Domain Age (years)</label>
              <input type="number" value={form.domain_age_years} onChange={(e) => setForm({ ...form, domain_age_years: Number(e.target.value) })} placeholder="How old is domain" className="mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Employee Count</label>
              <input type="number" value={form.employee_count} onChange={(e) => setForm({ ...form, employee_count: Number(e.target.value) })} placeholder="Approx employee size" className="mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-foreground">LinkedIn Company URL</label>
              <input value={form.linkedin_company_url} onChange={(e) => setForm({ ...form, linkedin_company_url: e.target.value })} placeholder="https://linkedin.com/company/..." className="mt-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none w-full" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-foreground">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.has_https} onChange={(e) => setForm({ ...form, has_https: e.target.checked })} /> HTTPS enabled</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.contact_matches_submission} onChange={(e) => setForm({ ...form, contact_matches_submission: e.target.checked })} /> Contact details match submission</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.office_proof_verified} onChange={(e) => setForm({ ...form, office_proof_verified: e.target.checked })} /> Office proof verified</label>
          </div>

          <button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
            {submitting ? "Evaluating..." : "Submit Verification"}
          </button>
        </motion.form>
      </div>
    </div>
  );
};

export default RecruiterVerification;
