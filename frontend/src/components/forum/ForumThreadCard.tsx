import { Link } from "react-router-dom";
import { ArrowRight, Lock, Pin, ShieldAlert, ThumbsUp, MessageSquare } from "lucide-react";
import { ForumThread } from "@/data/types";
import { Badge } from "@/components/ui/badge";

interface ForumThreadCardProps {
  thread: ForumThread;
}

const ForumThreadCard = ({ thread }: ForumThreadCardProps) => {
  const path = thread.category_slug ? `/forums/${thread.category_slug}/threads/${thread.id}` : `/forums/threads/${thread.id}`;

  return (
    <Link
      to={path}
      className="group block rounded-[1.5rem] border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
    >
      <div className="flex flex-wrap items-center gap-2">
        {thread.is_pinned && <Badge className="gap-1 bg-amber-50 text-amber-700"><Pin className="h-3 w-3" />Pinned</Badge>}
        {thread.is_locked && <Badge className="gap-1 bg-slate-100 text-slate-700"><Lock className="h-3 w-3" />Locked</Badge>}
        {thread.is_upvoted && <Badge className="gap-1 bg-emerald-50 text-emerald-700"><ThumbsUp className="h-3 w-3" />Upvoted</Badge>}
        {thread.is_flagged && <Badge className="gap-1 bg-rose-50 text-rose-700"><ShieldAlert className="h-3 w-3" />Flagged</Badge>}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{thread.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{thread.body}</p>
        </div>
        <div className="hidden rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground md:inline-flex">
          {thread.category_name}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>By {thread.author_name}</span>
        <span>•</span>
        <span>{new Date(thread.created_at).toLocaleDateString()}</span>
        <span>•</span>
        <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {thread.reply_count} replies</span>
        <span>•</span>
        <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {thread.upvote_count}</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
        Open thread
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
};

export default ForumThreadCard;
