import { useEffect, useRef, type ElementType } from "react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  as?: ElementType;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Click-to-edit inline text. Blur or Enter (unless multiline) saves.
 * Escape reverts.
 */
export function EditableText({
  value,
  onChange,
  as: Tag = "span",
  multiline = false,
  className,
  placeholder,
}: EditableTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref}
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      spellCheck={false}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          if (ref.current) ref.current.innerText = value;
          (e.target as HTMLElement).blur();
        }
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = e.currentTarget.innerText.trim();
        if (next !== value) onChange(next);
      }}
      className={cn(
        "outline-none rounded-sm px-0.5 -mx-0.5 text-black focus:bg-white focus:ring-1 focus:ring-brand-purple/30 hover:bg-slate-50 transition-colors cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60",
        className,
      )}

    />
  );
}
