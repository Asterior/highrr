import { ThumbsUp, Flag } from "lucide-react";
import { ForumPost } from "@/data/types";
import { Badge } from "@/components/ui/badge";

interface ForumPostItemProps {
  post: ForumPost;
  onUpvote?: () => void;
  onReport?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  actionDisabled?: boolean;
}

const ForumPostItem = ({ post, onUpvote, onReport, onEdit, onDelete, actionDisabled }: ForumPostItemProps) => (
  <article className="rounded-[1.25rem] border border-border bg-card p-5 shadow-card">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">{post.author_name}</h4>
          <Badge variant="outline" className="border-transparent bg-muted text-xs capitalize text-muted-foreground">
            {post.author_role}
          </Badge>
          {post.is_upvoted && <Badge className="bg-emerald-50 text-emerald-700">Upvoted</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-2">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            disabled={actionDisabled}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={actionDisabled}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove
          </button>
        )}
        {onUpvote && (
          <button
            type="button"
            onClick={onUpvote}
            disabled={actionDisabled}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {post.upvote_count}
          </button>
        )}
        {onReport && (
          <button
            type="button"
            onClick={onReport}
            disabled={actionDisabled}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Flag className="h-3.5 w-3.5" />
            Report
          </button>
        )}
      </div>
    </div>
    {post.body && post.body.startsWith("[removed by ") ? (
      <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
        {(() => {
          const match = post.body.match(/\[removed by\s+([^\]]+)\]/);
          const name = match ? match[1] : "admin";
          return <em>Removed by {name}</em>;
        })()}
      </div>
    ) : (
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{post.body}</p>
    )}
  </article>
);

export default ForumPostItem;
