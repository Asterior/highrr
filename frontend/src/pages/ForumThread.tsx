import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Flag, Lock, MessageSquare, Pin, ThumbsUp } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import StateDisplay from "@/components/StateDisplay";
import ForumComposer from "@/components/forum/ForumComposer";
import ForumPostItem from "@/components/forum/ForumPostItem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ForumThreadDetail } from "@/data/types";
import { createForumPost, deleteForumPost, deleteForumThread, getForumThread, reportForumContent, toggleForumUpvote, updateForumPost, updateForumThread } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useStore } from "@/stores/useStore";

const ForumThreadPage = () => {
  const { slug, threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useStore();
  const [thread, setThread] = useState<ForumThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  useEffect(() => {
    const loadThread = async () => {
      if (!threadId) {
        setError("Thread not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setThread(await getForumThread(threadId));
      } catch (loadError: any) {
        setError(loadError.message || "Failed to load thread");
      } finally {
        setLoading(false);
      }
    };

    loadThread();
  }, [threadId]);

  const categoryPath = thread?.category_slug || slug;

  const stats = useMemo(() => [
    { label: "Replies", value: thread?.reply_count ?? 0 },
    { label: "Views", value: thread?.view_count ?? 0 },
    { label: "Upvotes", value: thread?.upvote_count ?? 0 },
    { label: "Posts shown", value: thread?.posts.length ?? 0 },
  ], [thread]);

  const updateThread = (updater: (current: ForumThreadDetail) => ForumThreadDetail) => {
    setThread((current) => (current ? updater(current) : current));
  };

  const canManageThread = Boolean(thread && thread.author_id === user.id);
  const canEditPost = (postAuthorId: number) => postAuthorId === user.id;
  const canDeletePost = (postAuthorId: number) => user.role === "admin" || postAuthorId === user.id;

  const handleToggleUpvote = async () => {
    if (!thread) return;
    const actionKey = `thread-upvote-${thread.id}`;
    try {
      setBusyAction(actionKey);
      const result = await toggleForumUpvote({ thread_id: thread.id });
      updateThread((current) => ({
        ...current,
        is_upvoted: result.upvoted,
        upvote_count: result.upvote_count,
      }));
    } catch (toggleError: any) {
      toast({ title: "Upvote failed", description: toggleError.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  const handleReport = async (threadOrPostId: number, type: "thread" | "post") => {
    const reason = window.prompt(`Why are you reporting this ${type}?`);
    if (!reason) return;

    const actionKey = `${type}-report-${threadOrPostId}`;
    try {
      setBusyAction(actionKey);
      await reportForumContent(type === "thread" ? { thread_id: threadOrPostId, reason } : { post_id: threadOrPostId, reason });
      toast({ title: "Report submitted", description: "Moderators will review it soon." });
    } catch (reportError: any) {
      toast({ title: "Report failed", description: reportError.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!thread) return;

    try {
      setBusyAction(`reply-${thread.id}`);
      const post = await createForumPost({ thread_id: thread.id, body: replyBody });
      updateThread((current) => ({
        ...current,
        posts: [...current.posts, post],
        reply_count: current.reply_count + 1,
      }));
      setReplyBody("");
      toast({ title: "Reply posted" });
    } catch (postError: any) {
      toast({ title: "Could not post reply", description: postError.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  const handleEditThread = async () => {
    if (!thread || !canManageThread) return;
    const nextTitle = window.prompt("Edit thread title", thread.title);
    if (nextTitle === null) return;
    const nextBody = window.prompt("Edit thread body", thread.body);
    if (nextBody === null) return;

    try {
      setBusyAction(`thread-edit-${thread.id}`);
      const updated = await updateForumThread(thread.id, { title: nextTitle, body: nextBody });
      setThread(updated);
      toast({ title: "Thread updated" });
    } catch (editError: any) {
      toast({ title: "Could not update thread", description: editError.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteThread = async () => {
    if (!thread || user.role !== "admin") return;
    if (!window.confirm("Remove this thread? This will delete the discussion and replies.")) return;
    try {
      setBusyAction(`thread-delete-${thread.id}`);
      await deleteForumThread(thread.id);
      toast({ title: "Thread removed" });
      navigate("/forums");
    } catch (deleteError: any) {
      toast({ title: "Could not remove thread", description: deleteError.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePostUpvote = async (postId: number) => {
    if (!thread) return;
    const actionKey = `post-upvote-${postId}`;
    try {
      setBusyAction(actionKey);
      const result = await toggleForumUpvote({ post_id: postId });
      updateThread((current) => ({
        ...current,
        posts: current.posts.map((post) =>
          post.id === postId ? { ...post, is_upvoted: result.upvoted, upvote_count: result.upvote_count } : post,
        ),
      }));
    } catch (upvoteError: any) {
      toast({ title: "Upvote failed", description: upvoteError.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  const handleEditPost = async (postId: number) => {
    if (!thread) return;
    const currentPost = thread.posts.find((post) => post.id === postId);
    if (!currentPost || !canEditPost(currentPost.author_id)) return;
    const nextBody = window.prompt("Edit reply", currentPost.body);
    if (nextBody === null) return;

    try {
      setBusyAction(`post-edit-${postId}`);
      const updated = await updateForumPost(postId, { body: nextBody });
      updateThread((current) => ({
        ...current,
        posts: current.posts.map((post) => (post.id === postId ? updated : post)),
      }));
      toast({ title: "Reply updated" });
    } catch (editError: any) {
      toast({ title: "Could not update reply", description: editError.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!thread) return;
    const currentPost = thread.posts.find((post) => post.id === postId);
    if (!currentPost || !canDeletePost(currentPost.author_id)) return;
    if (!window.confirm("Remove this reply?")) return;

    try {
      setBusyAction(`post-delete-${postId}`);
      await deleteForumPost(postId);
      const removedLabel = user.role === "admin" ? user.name : currentPost.author_name;
      updateThread((current) => ({
        ...current,
        posts: current.posts.map((post) =>
          post.id === postId ? { ...post, body: `[removed by ${removedLabel}]` } : post,
        ),
      }));
      toast({ title: "Reply removed" });
    } catch (deleteError: any) {
      toast({ title: "Could not remove reply", description: deleteError.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  const isLocked = thread?.is_locked;

  return (
    <PageLayout>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Link to={categoryPath ? `/forums/${categoryPath}` : "/forums"} className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to category
        </Link>
        <span>•</span>
        <Link to="/forums" className="hover:text-foreground hover:underline">
          Forums
        </Link>
      </div>

      <div className="mt-6 rounded-[2rem] border border-border bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-8 shadow-card">
        <StateDisplay loading={loading} error={error} empty={!thread} emptyMessage="Thread not found." onRetry={() => window.location.reload()}>
          <>
            <div className="flex flex-wrap items-center gap-2">
              {thread?.is_pinned && <Badge className="gap-1 bg-amber-50 text-amber-700"><Pin className="h-3 w-3" />Pinned</Badge>}
              {thread?.is_locked && <Badge className="gap-1 bg-slate-100 text-slate-700"><Lock className="h-3 w-3" />Locked</Badge>}
              <Badge variant="outline" className="border-transparent bg-emerald-50 text-emerald-700">
                {thread?.category_name}
              </Badge>
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-foreground">{thread?.title}</h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-muted-foreground">{thread?.body}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>By {thread?.author_name}</span>
              <span>•</span>
              <span>{thread ? new Date(thread.created_at).toLocaleString() : ""}</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={handleToggleUpvote} disabled={busyAction === `thread-upvote-${thread?.id}`} className="gap-2 rounded-full">
                <ThumbsUp className="h-4 w-4" />
                {thread?.is_upvoted ? "Remove upvote" : "Upvote"}
              </Button>
              {canManageThread && (
                <Button variant="outline" onClick={handleEditThread} disabled={busyAction === `thread-edit-${thread?.id}`} className="gap-2 rounded-full">
                  Edit thread
                </Button>
              )}
              {user.role === "admin" && (
                <Button variant="outline" onClick={handleDeleteThread} disabled={busyAction === `thread-delete-${thread?.id}`} className="gap-2 rounded-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                  Remove thread
                </Button>
              )}
              <Button variant="outline" onClick={() => thread && handleReport(thread.id, "thread")} disabled={busyAction === `thread-report-${thread?.id}`} className="gap-2 rounded-full">
                <Flag className="h-4 w-4" />
                Report thread
              </Button>
            </div>
          </>
        </StateDisplay>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <MessageSquare className="h-4 w-4 text-primary" />
            Replies
          </div>
          <StateDisplay
            loading={loading}
            error={null}
            empty={!thread || thread.posts.length === 0}
            emptyMessage="No replies yet. Start the conversation below."
          >
            <div className="space-y-4">
              {thread?.posts.map((post) => (
                <ForumPostItem
                  key={post.id}
                  post={post}
                  actionDisabled={busyAction === `post-upvote-${post.id}` || busyAction === `post-report-${post.id}` || busyAction === `post-edit-${post.id}` || busyAction === `post-delete-${post.id}`}
                  onUpvote={() => handlePostUpvote(post.id)}
                  onReport={() => handleReport(post.id, "post")}
                  onEdit={canEditPost(post.author_id) ? () => handleEditPost(post.id) : undefined}
                  onDelete={canDeletePost(post.author_id) ? () => handleDeletePost(post.id) : undefined}
                />
              ))}
            </div>
          </StateDisplay>
        </div>

        <div className="space-y-4">
          {isLocked ? (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em]"><Lock className="h-4 w-4" /> Thread locked</div>
              <p className="mt-3 text-sm leading-6">Moderators have paused replies here. You can still read the discussion and report content if needed.</p>
            </div>
          ) : (
            <ForumComposer
              title="Add a reply"
              bodyValue={replyBody}
              onBodyChange={setReplyBody}
              onSubmit={handleCreateReply}
              submitLabel={busyAction === `reply-${thread?.id}` ? "Posting..." : "Post reply"}
              placeholder="Share a useful reply, a counterpoint, or a follow-up question."
              disabled={!thread || busyAction === `reply-${thread?.id}`}
            />
          )}
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card">
            <p className="text-sm font-semibold text-foreground">Discussion notes</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>Replies stay in chronological order.</li>
              <li>Upvotes surface helpful context, not popularity alone.</li>
              <li>Anything suspicious can be reported from the thread or a reply.</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ForumThreadPage;
