import { useState } from "react";
import { BadgeCheck, Bell, RefreshCcw } from "lucide-react";

interface VerificationBadgeProps {
  badgeLevel: "unverified" | "basic" | "strong" | "trusted";
  checks: {
    gst: boolean;
    domain: boolean;
    website?: boolean;
    email?: boolean;
    dns?: boolean;
    linkedin: boolean;
  };
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export default function VerificationBadge({
  badgeLevel,
  checks,
  onRefresh,
  refreshing = false,
}: VerificationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const config =
    badgeLevel === "trusted"
      ? {
          icon: <BadgeCheck className="h-3.5 w-3.5" />,
          label: "Trusted Employer",
          wrapper: "border-sky-200 bg-sky-50 text-sky-700",
        }
      : badgeLevel === "strong"
        ? {
            icon: <BadgeCheck className="h-3.5 w-3.5" />,
            label: "Verified Employer",
            wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700",
          }
        : badgeLevel === "basic"
        ? {
            icon: <Bell className="h-3.5 w-3.5" />,
            label: "Basic Employer",
            wrapper: "border-amber-200 bg-amber-50 text-amber-700",
          }
        : {
            icon: <Bell className="h-3.5 w-3.5" />,
            label: "Unverified Employer",
            wrapper: "border-rose-200 bg-rose-50 text-rose-700",
          };

  return (
    <div
      className="relative inline-flex items-center gap-2"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.wrapper}`}>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70">
          {config.icon}
        </span>
        <span>{config.label}</span>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          title="Recheck verification"
          aria-label="Recheck verification"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      )}

      {showTooltip && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-gray-200 bg-white p-3 shadow-md">
          <p className="mb-2 text-xs font-medium text-gray-700">Verification checks</p>
          {[
            { label: "GST Number", passed: checks.gst },
            { label: "Website Domain", passed: checks.domain },
            { label: "Website Live", passed: checks.website ?? false },
            { label: "Business Email", passed: checks.email ?? false },
            { label: "DNS / MX", passed: checks.dns ?? false },
            { label: "LinkedIn Page", passed: checks.linkedin },
          ].map(({ label, passed }) => (
            <div key={label} className="flex items-center justify-between py-1 text-xs">
              <span className="text-gray-600">{label}</span>
              {passed ? (
                <span className="font-medium text-green-500">✓</span>
              ) : (
                <span className="font-medium text-red-400">✗</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
