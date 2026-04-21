import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import StateDisplay from "@/components/StateDisplay";
import { getNotifications, type NotificationResponse } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const parseTitle = (title: string): { jobTitle: string; companyName: string } => {
  const match = title.match(/^New job match: (.+) at (.+)$/i);
  if (match) {
    return { jobTitle: match[1], companyName: match[2] };
  }
  return { jobTitle: title, companyName: "" };
};

const timeStamp = (value: string): string => new Date(value).toLocaleString();

const Notifications = () => {
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;
  const token = localStorage.getItem("token") || "";

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications(page, pageSize);
      setItems(data.items || []);
      setTotalCount(data.total_count || 0);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notifications";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadNotifications().catch(() => {
      toast({ title: "Failed to load notifications", variant: "destructive" });
    });
  }, [page]);

  const start = useMemo(() => (totalCount === 0 ? 0 : (page - 1) * pageSize + 1), [page, totalCount]);
  const end = useMemo(() => Math.min(totalCount, page * pageSize), [page, totalCount]);

  return (
    <PageLayout>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Unread: {unreadCount}</p>
        </div>
      </div>

      <div className="mt-6">
        <StateDisplay
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyMessage={"No notifications yet.\nSet up job alerts to get notified about matching jobs."}
          onRetry={loadNotifications}
        >
          <div className="space-y-3">
            {items.map((notification) => {
              const parsed = parseTitle(notification.title);
              return (
                <div
                  key={notification.id}
                  className={`rounded-2xl border border-border bg-white p-5 shadow-card ${notification.is_read ? "border-l-2 border-transparent" : "border-l-2 border-purple-500 bg-purple-50"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {notification.job_id ? (
                          <Link to={`/jobs/${notification.job_id}`} className="text-base font-semibold text-gray-900 hover:text-purple-700">
                            {parsed.jobTitle}
                          </Link>
                        ) : (
                          <p className="text-base font-semibold text-gray-900">{parsed.jobTitle}</p>
                        )}
                        {parsed.companyName && <span className="text-sm text-gray-500">{parsed.companyName}</span>}
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{notification.body}</p>
                      <p className="mt-2 text-xs text-gray-500">{timeStamp(notification.created_at)}</p>
                    </div>
                    {notification.job_id && (
                      <Link to={`/candidate/jobs?job=${notification.job_id}&apply=1`} className="rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700">
                        Apply Now
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </StateDisplay>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="text-sm text-muted-foreground">
          Showing {start}-{end} of {totalCount} notifications
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page * pageSize >= totalCount}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </PageLayout>
  );
};

export default Notifications;