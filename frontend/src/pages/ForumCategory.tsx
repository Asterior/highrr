import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import StateDisplay from "@/components/StateDisplay";
import ForumHero from "@/components/forum/ForumHero";
import ForumThreadCard from "@/components/forum/ForumThreadCard";
import ForumComposer from "@/components/forum/ForumComposer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ForumCategory, ForumThreadPage } from "@/data/types";
import { createForumThread, getForumCategories, getForumThreads } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const ForumCategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [threadPage, setThreadPage] = useState<ForumThreadPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const loadCategory = async () => {
      if (!slug) {
        setError("Category not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [allCategories, threads] = await Promise.all([getForumCategories(), getForumThreads(slug, page, 12)]);
        setCategories(allCategories);
        setThreadPage(threads);
      } catch (loadError: any) {
        setError(loadError.message || "Failed to load category threads");
      } finally {
        setLoading(false);
      }
    };

    loadCategory();
  }, [slug, page]);

  const category = useMemo(() => categories.find((entry) => entry.slug === slug) || null, [categories, slug]);

  const stats = useMemo(() => [
    { label: "Threads", value: threadPage?.total ?? category?.thread_count ?? 0 },
    { label: "Current page", value: page },
    { label: "Pages", value: threadPage?.pages ?? 0 },
    { label: "Focused replies", value: threadPage?.items.reduce((sum, item) => sum + item.reply_count, 0) ?? 0 },
  ], [category?.thread_count, page, threadPage]);

  const handleCreateThread = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slug || !category) return;

    try {
      setSubmitting(true);
      const created = await createForumThread({ category_id: category.id, title, body });
      toast({ title: "Thread created", description: "Your discussion is live." });
      navigate(`/forums/${slug}/threads/${created.id}`);
    } catch (createError: any) {
      toast({ title: "Could not create thread", description: createError.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Link to="/forums" className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to forums
        </Link>
        <span>•</span>
        <span>{category?.name || slug}</span>
      </div>

      <div className="mt-4">
        <ForumHero
          eyebrow={category?.name || "Category"}
          title={category?.name || "Browse the latest threads"}
          description={category?.description || "Threads are flat, replies stay chronological, and moderators can step in when reports stack up."}
          stats={stats}
          action={
            <Badge variant="outline" className="border-white/15 bg-white/10 px-4 py-2 text-white">
              <Plus className="mr-1 h-3.5 w-3.5" /> Start a discussion
            </Badge>
          }
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.9fr]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Threads</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">Latest discussions</h2>
            </div>
            {threadPage && threadPage.pages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= threadPage.pages} onClick={() => setPage((current) => Math.min(current + 1, threadPage.pages))}>
                  Next
                </Button>
              </div>
            )}
          </div>

          <StateDisplay
            loading={loading}
            error={error}
            empty={!threadPage || threadPage.items.length === 0}
            emptyMessage="No threads in this category yet. Be the first to start one."
            onRetry={() => window.location.reload()}
          >
            <div className="space-y-4">
              {threadPage?.items.map((thread) => <ForumThreadCard key={thread.id} thread={thread} />)}
            </div>
          </StateDisplay>
        </div>

        <div className="space-y-4">
          <ForumComposer
            title="Start a thread"
            titleValue={title}
            bodyValue={body}
            onTitleChange={setTitle}
            onBodyChange={setBody}
            onSubmit={handleCreateThread}
            submitLabel={submitting ? "Publishing..." : "Publish thread"}
            showTitleField
            disabled={submitting || !category}
            helperText="Keep it specific. Good threads ask for advice, show context, or share a concrete hiring story."
          />
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card">
            <p className="text-sm font-semibold text-foreground">Posting rules</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>No nested replies.</li>
              <li>No self-promotion spam or referral farming.</li>
              <li>Reports can auto-flag content for review.</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ForumCategoryPage;
