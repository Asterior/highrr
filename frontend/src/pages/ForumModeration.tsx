import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import StateDisplay from "@/components/StateDisplay";
import ForumHero from "@/components/forum/ForumHero";
import ForumModerationCard from "@/components/forum/ForumModerationCard";
import { ForumModerationItem } from "@/data/types";
import { deleteForumPost, deleteForumThread, getForumModerationQueue, lockForumThread, resolveForumReport } from "@/services/api";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";

const ForumModerationPage = () => {
  const { user } = useStore();
  const [queue, setQueue] = useState<ForumModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      setQueue(await getForumModerationQueue());
    } catch (loadError: any) {
      setError(loadError.message || "Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const stats = useMemo(() => [
    { label: "Flagged items", value: queue.length },
    { label: "Threads", value: queue.filter((item) => item.type === "thread").length },
    { label: "Posts", value: queue.filter((item) => item.type === "post").length },
    { label: "Open reports", value: queue.reduce((sum, item) => sum + item.report_count, 0) },
  ], [queue]);

  const runAction = async (item: ForumModerationItem, action: "lock" | "delete" | "resolve") => {
    const key = `${item.type}-${item.id}-${action}`;
    try {
      setBusyId(key);
      if (action === "lock" && item.type === "thread") {
        await lockForumThread(item.id);
      } else if (action === "delete" && item.type === "thread") {
        await deleteForumThread(item.id);
      } else if (action === "delete" && item.type === "post") {
        await deleteForumPost(item.id);
      } else {
        for (const reportId of item.report_ids) {
          await resolveForumReport(reportId);
        }
      }
      toast({ title: "Moderation action completed" });
      await loadQueue();
    } catch (moderationError: any) {
      toast({ title: "Action failed", description: moderationError.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  if (user.role !== "admin") {
    return (
      <PageLayout>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">The moderation queue is restricted to admins.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <ForumHero
        eyebrow="Moderation"
        title="Review flagged threads and posts before they spread"
        description="Reports accumulate here once content crosses the auto-flag threshold or a moderator wants a second look. Resolve reports, lock threads, or remove content from the queue."
        stats={stats}
        action={
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4" />
            Admin only
          </div>
        }
      />

      <div className="mt-8">
        <StateDisplay loading={loading} error={error} empty={queue.length === 0} emptyMessage="No flagged forum items right now." onRetry={loadQueue}>
          <div className="space-y-4">
            {queue.map((item) => (
              <ForumModerationCard
                key={`${item.type}-${item.id}`}
                item={item}
                busy={busyId?.startsWith(`${item.type}-${item.id}`)}
                onLock={item.type === "thread" ? () => runAction(item, "lock") : undefined}
                onDelete={() => runAction(item, "delete")}
                onResolve={() => runAction(item, "resolve")}
              />
            ))}
          </div>
        </StateDisplay>
      </div>
    </PageLayout>
  );
};

export default ForumModerationPage;
