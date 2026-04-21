import { useState } from "react";

interface VerificationBadgeProps {
  badgeLevel: "verified" | "partial" | "unverified";
  checks: {
    gst: boolean;
    domain: boolean;
    linkedin: boolean;
  };
}

export default function VerificationBadge({
  badgeLevel,
  checks,
}: VerificationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (badgeLevel === "unverified") return null;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {badgeLevel === "verified" ? (
        <div className="flex items-center gap-1 text-purple-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z" />
          </svg>
          <span className="text-xs font-medium">Verified Employer</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z" />
          </svg>
          <span className="text-xs font-medium">Partially Verified</span>
        </div>
      )}

      {showTooltip && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-gray-200 bg-white p-3 shadow-md">
          <p className="mb-2 text-xs font-medium text-gray-700">Verification checks</p>
          {[
            { label: "GST Number", passed: checks.gst },
            { label: "Website Domain", passed: checks.domain },
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
