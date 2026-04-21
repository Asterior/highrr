import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createAlert, getAlertOptions, type AlertCreate, type AlertOptionsResponse } from "@/services/api";

interface AddAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}

const AddAlertModal = ({ open, onOpenChange, onSaved }: AddAlertModalProps) => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxExperience, setMaxExperience] = useState("");
  const [options, setOptions] = useState<AlertOptionsResponse>({
    role_keywords: [],
    locations: [],
    min_salary_options: [],
    max_experience_options: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        setError(null);
        const data = await getAlertOptions();
        setOptions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dropdown values");
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions().catch(() => {
      setError("Failed to load dropdown values");
      setLoadingOptions(false);
    });
  }, [open]);

  const addKeyword = () => {
    const normalized = customKeyword.trim();
    if (!normalized) return;
    setKeywords((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setCustomKeyword("");
  };

  const addSelectedKeywords = () => {
    if (selectedKeywords.length === 0) return;
    setKeywords((prev) => {
      const next = new Set(prev);
      selectedKeywords.forEach((keyword) => next.add(keyword));
      return Array.from(next);
    });
    setSelectedKeywords([]);
  };

  const handleSave = async () => {
    if (keywords.length === 0) {
      setError("Add at least one keyword.");
      return;
    }

    const payload: AlertCreate = {
      role_keywords: keywords,
      location: location.trim() || undefined,
      min_salary: minSalary ? Number(minSalary) : undefined,
      max_experience: maxExperience ? Number(maxExperience) : undefined,
    };

    try {
      setSaving(true);
      setError(null);
      await createAlert(payload);
      await onSaved();
      onOpenChange(false);
      setKeywords([]);
      setSelectedKeywords([]);
      setCustomKeyword("");
      setLocation("");
      setMinSalary("");
      setMaxExperience("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save alert");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Job Alert</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Keywords</label>
            <div className="rounded-2xl border border-border bg-muted/20 p-3">
              <select
                multiple
                value={selectedKeywords}
                onChange={(event) => setSelectedKeywords(Array.from(event.target.selectedOptions, (option) => option.value))}
                className="h-44 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none"
                disabled={loadingOptions}
              >
                {options.role_keywords.map((keyword) => (
                  <option key={keyword} value={keyword}>{keyword}</option>
                ))}
              </select>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Use Ctrl or Cmd to choose multiple existing keywords.</span>
                <Button type="button" onClick={addSelectedKeywords} variant="outline" className="h-8 px-3 text-xs">
                  Add selected
                </Button>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={customKeyword}
                onChange={(event) => setCustomKeyword(event.target.value)}
                className="flex-1 rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
                placeholder="Or type a custom keyword"
                disabled={loadingOptions}
              />
              <Button type="button" onClick={addKeyword} variant="outline">Add</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => setKeywords((prev) => prev.filter((item) => item !== keyword))}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700"
                >
                  {keyword}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Location</label>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
              disabled={loadingOptions}
            >
              <option value="">Any location</option>
              {options.locations.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Minimum Salary</label>
              <select
                value={minSalary}
                onChange={(event) => setMinSalary(event.target.value)}
                className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
                disabled={loadingOptions}
              >
                <option value="">Any salary</option>
                {options.min_salary_options.map((value) => (
                  <option key={value} value={String(value)}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Max Experience (years)</label>
              <select
                value={maxExperience}
                onChange={(event) => setMaxExperience(event.target.value)}
                className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
                disabled={loadingOptions}
              >
                <option value="">Any experience</option>
                {options.max_experience_options.map((value) => (
                  <option key={value} value={String(value)}>{value}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAlertModal;