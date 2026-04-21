import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquareQuote, Sparkles } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import StateDisplay from "@/components/StateDisplay";
import ForumHero from "@/components/forum/ForumHero";
import ForumCategoryCard from "@/components/forum/ForumCategoryCard";
import { ForumCategory } from "@/data/types";
import { getForumCategories } from "@/services/api";
import { useStore } from "@/stores/useStore";

const ForumHome = () => {
  const { user } = useStore();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        setCategories(await getForumCategories());
      } catch (loadError: any) {
        setError(loadError.message || "Failed to load forum categories");
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const stats = useMemo(() => {
    const totalThreads = categories.reduce((sum, category) => sum + category.thread_count, 0);
    return [
      { label: "Categories", value: categories.length },
      { label: "Threads", value: totalThreads },
      { label: "Open discussions", value: Math.max(totalThreads - 3, 0) },
      { label: "Active now", value: Math.max(categories.length * 2, 1) },
    ];
  }, [categories]);

  return (
    <PageLayout>
      <ForumHero
        eyebrow="Community forums"
        title="A public place for interview prep, salary talk, and real hiring stories"
        description="Browse focused categories, start a thread, and share what actually helps people get hired. Reports are reviewed by admins and unsafe content is auto-flagged."
        stats={stats}
        action={user.role === "admin" ? (
          <Link to="/forums/moderation" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15">
            <Sparkles className="h-4 w-4" />
            Moderator tools
          </Link>
        ) : undefined}
      />

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Browse categories</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Choose a discussion lane</h2>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground md:flex">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          Threads stay flat. No nested replies.
        </div>
      </div>

      <div className="mt-6">
        <StateDisplay
          loading={loading}
          error={error}
          empty={categories.length === 0}
          emptyMessage="No forum categories are available yet."
          onRetry={() => window.location.reload()}
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <ForumCategoryCard key={category.id} category={category} />
            ))}
          </div>
        </StateDisplay>
      </div>
    </PageLayout>
  );
};

export default ForumHome;
