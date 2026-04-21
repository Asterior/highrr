import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import StateDisplay from "@/components/StateDisplay";
import AddAlertModal from "@/components/alerts/AddAlertModal";
import { deleteAlert, getAlerts, type AlertResponse } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const JobAlerts = () => {
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAlerts();
      setAlerts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts().catch(() => {
      toast({ title: "Failed to load alerts", variant: "destructive" });
    });
  }, []);

  const handleDelete = async (alertId: number) => {
    if (!window.confirm("Delete this job alert?")) return;
    try {
      await deleteAlert(alertId);
      await loadAlerts();
      toast({ title: "Alert deleted" });
    } catch (err) {
      toast({ title: "Failed to delete alert", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  };

  return (
    <PageLayout>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Get notified when jobs matching your preferences are posted</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" /> Add Alert
        </button>
      </div>

      <div className="mt-6">
        <StateDisplay
          loading={loading}
          error={error}
          empty={alerts.length === 0}
          emptyMessage="No alerts yet. Create one to get notified when matching jobs are posted."
          onRetry={loadAlerts}
        >
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      {alert.role_keywords.map((keyword) => (
                        <span key={keyword} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                      <p>Location: {alert.location || "Any"}</p>
                      <p>Min salary: {alert.min_salary ?? "Any"}</p>
                      <p>Max experience: {alert.max_experience ?? "Any"}</p>
                      <p>Created: {new Date(alert.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Last triggered: {alert.last_triggered_at ? new Date(alert.last_triggered_at).toLocaleString() : "Never triggered yet"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </StateDisplay>
      </div>

      <AddAlertModal open={showModal} onOpenChange={setShowModal} onSaved={loadAlerts} />
    </PageLayout>
  );
};

export default JobAlerts;