import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface StateDisplayProps {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyMessage: string;
  onRetry?: () => void;
  children: ReactNode;
}

const StateDisplay = ({ loading, error, empty, emptyMessage, onRetry, children }: StateDisplayProps) => {
  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
        <p className="text-sm font-medium">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4 border-red-200 bg-white text-red-700 hover:bg-red-100">
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (empty) {
    return <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return <>{children}</>;
};

export default StateDisplay;