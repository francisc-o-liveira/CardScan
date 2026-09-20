"use client";

import { Search, X, Loader2 } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Visible label for assistive tech; the placeholder alone is not a label. */
  label: string;
  isLoading?: boolean;
  size?: "md" | "lg";
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onValueChange, label, isLoading, size = "md", className, ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-hairline bg-base-200 px-3.5 transition-colors duration-fast focus-within:border-primary/60",
        size === "lg" ? "h-13 min-h-13 py-3" : "h-11 min-h-11",
        className,
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" aria-hidden />
      ) : (
        <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden />
      )}
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="min-w-0 grow bg-transparent text-body text-base-content placeholder:text-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Clear search"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-fast hover:bg-base-300 hover:text-base-content"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
});
