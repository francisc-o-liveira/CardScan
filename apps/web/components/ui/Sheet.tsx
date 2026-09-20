"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Sticky footer — put the confirm/clear actions here. */
  footer?: ReactNode;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * One overlay component for both breakpoints: a bottom sheet on phones (thumb
 * reachable) and a right-hand panel from `md` up. Same content, same code path,
 * so filters never drift between platforms.
 */
export function Sheet({ open, onClose, title, footer, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    // Lock background scroll without the layout shifting as the bar disappears.
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreFocusTo.current?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] motion-safe:animate-[fade-in-up_160ms_ease-out]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[88dvh] w-full flex-col rounded-t-hero border border-hairline bg-base-100 shadow-lg",
          "md:h-full md:max-h-none md:w-[24rem] md:rounded-none md:rounded-l-hero md:border-y-0 md:border-r-0",
          "motion-safe:animate-sheet-up md:motion-safe:animate-none",
        )}
      >
        {/* Drag affordance — signals "swipe/tap away" on touch. */}
        <div className="flex justify-center pt-3 md:hidden" aria-hidden>
          <span className="h-1 w-9 rounded-full bg-strong" />
        </div>

        <header className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="text-section font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-fast hover:bg-base-200 hover:text-base-content"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

        {footer && (
          <footer className="border-t border-hairline bg-base-100 px-5 py-4 pb-safe">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
