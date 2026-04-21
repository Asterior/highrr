import { ForumModerationItem } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Trash2, ShieldCheck } from "lucide-react";

interface ForumModerationCardProps {
  item: ForumModerationItem;
  onLock?: () => void;
  onDelete?: () => void;
  onResolve?: () => void;
  busy?: boolean;
}

const ForumModerationCard = ({ item, onLock, onDelete, onResolve, busy = false }: ForumModerationCardProps) => (
  <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-transparent bg-rose-50 text-rose-700 capitalize">
            {item.type}
          </Badge>
          <span className="text-sm font-semibold text-foreground">#{item.id}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.content_preview}</p>
      </div>
      <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
        {item.report_count} reports
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      {item.reasons.map((reason, index) => (
        <Badge key={`${item.id}-${index}`} variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          {reason}
        </Badge>
      ))}
    </div>

    <div className="mt-5 flex flex-wrap gap-2">
      {item.type === "thread" && onLock && (
        <Button variant="outline" onClick={onLock} disabled={busy} className="gap-2 rounded-full">
          <Lock className="h-4 w-4" />
          Lock thread
        </Button>
      )}
      {onDelete && (
        <Button variant="outline" onClick={onDelete} disabled={busy} className="gap-2 rounded-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
          <Trash2 className="h-4 w-4" />
          Delete {item.type}
        </Button>
      )}
      {onResolve && (
        <Button onClick={onResolve} disabled={busy} className="gap-2 rounded-full">
          <ShieldCheck className="h-4 w-4" />
          Resolve reports
        </Button>
      )}
    </div>
  </article>
);

export default ForumModerationCard;
