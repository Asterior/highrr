import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface ForumComposerProps {
  title?: string;
  titleValue?: string;
  bodyValue: string;
  onTitleChange?: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  placeholder?: string;
  showTitleField?: boolean;
  disabled?: boolean;
  helperText?: string;
}

const ForumComposer = ({
  title,
  titleValue,
  bodyValue,
  onTitleChange,
  onBodyChange,
  onSubmit,
  submitLabel,
  placeholder,
  showTitleField = false,
  disabled = false,
  helperText,
}: ForumComposerProps) => (
  <form onSubmit={onSubmit} className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card">
    {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
    {helperText && <p className="mt-1 text-sm leading-6 text-muted-foreground">{helperText}</p>}
    <div className="mt-4 space-y-3">
      {showTitleField && (
        <Input
          value={titleValue || ""}
          onChange={(event) => onTitleChange?.(event.target.value)}
          placeholder="Thread title"
          className="h-12 rounded-2xl"
          disabled={disabled}
        />
      )}
      <Textarea
        value={bodyValue}
        onChange={(event) => onBodyChange(event.target.value)}
        placeholder={placeholder || "Share your thoughts..."}
        className="min-h-[140px] rounded-2xl border-border bg-background"
        disabled={disabled}
      />
    </div>
    <div className="mt-4 flex items-center justify-end gap-3">
      <Button type="submit" disabled={disabled} className="rounded-full px-5">
        {submitLabel}
      </Button>
    </div>
  </form>
);

export default ForumComposer;
