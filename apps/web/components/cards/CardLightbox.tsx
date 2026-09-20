"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Full-bleed look at the artwork. Collectors zoom in on print detail, holo
 * patterns and text boxes constantly — on a card app that is a core need, not
 * a flourish, so it gets its own dismissable layer rather than a hover zoom.
 */
export function CardLightbox({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name}, enlarged`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/88 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close enlarged card"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-fast hover:bg-white/20"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      <img
        src={src}
        alt={name}
        className="max-h-full max-w-full rounded-xl object-contain shadow-2xl motion-safe:animate-pop-in"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
