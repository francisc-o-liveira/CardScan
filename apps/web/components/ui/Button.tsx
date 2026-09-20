"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * The app's only button. Every call site picks a variant here rather than
 * hand-rolling classes, which is what keeps the action hierarchy readable:
 * one `primary` per screen, everything else secondary or quieter.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-content shadow-sm hover:bg-primary/90 active:bg-primary/95 border border-transparent",
  secondary:
    "bg-base-300 text-base-content border border-hairline hover:bg-base-300/70 active:bg-base-300",
  outline:
    "bg-transparent text-base-content border border-strong hover:bg-base-200 active:bg-base-300",
  ghost:
    "bg-transparent text-muted border border-transparent hover:bg-base-200 hover:text-base-content",
  danger:
    "bg-transparent text-error border border-error/40 hover:bg-error/10 active:bg-error/15",
};

const SIZES: Record<ButtonSize, string> = {
  // min-h keeps every size at or above the 44px touch target on coarse pointers.
  sm: "h-9 min-h-9 px-3 text-meta gap-1.5 rounded-lg",
  md: "h-11 min-h-11 px-4 text-body gap-2 rounded-xl",
  lg: "h-12 min-h-12 px-5 text-body gap-2 rounded-xl font-medium",
};

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-fast ease-standard disabled:pointer-events-none disabled:opacity-45 select-none";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretches to the container — use for the primary action in sheets and forms. */
  block?: boolean;
  isLoading?: boolean;
  children?: ReactNode;
  className?: string;
}

export interface ButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", block, isLoading, children, className, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className)}
      {...rest}
    >
      {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export interface ButtonLinkProps extends CommonProps {
  href: string;
  "aria-label"?: string;
  onClick?: () => void;
  prefetch?: boolean;
}

/** Same visual system as Button, for navigation rather than actions. */
export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  block,
  children,
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Square icon-only button. `label` is required — it becomes the accessible name. */
export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className,
  children,
  ...rest
}: Omit<ButtonProps, "block" | "children"> & { label: string; children: ReactNode }) {
  const box = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-12 w-12" : "h-11 w-11";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        BASE,
        VARIANTS[variant],
        box,
        "shrink-0 rounded-xl p-0",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
