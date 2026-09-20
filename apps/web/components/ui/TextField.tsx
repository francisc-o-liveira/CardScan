"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  /** Validation message. Its presence is what puts the field in the error state. */
  error?: string;
  /** Persistent guidance shown under the field, e.g. password rules. */
  hint?: string;
}

/**
 * Form input with a real, visible label.
 *
 * Errors are announced (`role="alert"`) and marked on the field itself via
 * `aria-invalid`, not signalled by a red border alone.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, className, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-meta font-medium text-base-content">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hint && hintId) || undefined}
        className={cn(
          "h-11 min-h-11 rounded-xl border bg-base-100 px-3.5 text-body text-base-content transition-colors duration-fast",
          "placeholder:text-faint focus:outline-none focus-visible:outline-none",
          error
            ? "border-error focus:border-error"
            : "border-hairline focus:border-primary",
        )}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-meta text-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-meta text-error">
          {error}
        </p>
      )}
    </div>
  );
});
