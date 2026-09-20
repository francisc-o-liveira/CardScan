"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Check, AlertCircle, Info } from "lucide-react";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

const ICONS: Record<ToastTone, typeof Check> = {
  success: Check,
  error: AlertCircle,
  info: Info,
};

const TONES: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-error",
  info: "text-info",
};

let nextId = 0;

/**
 * Lightweight confirmation layer. Toasts confirm that something happened
 * ("Charizard added") — they are never the only place an error is reported.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // Sits above the mobile bottom nav so it never covers the primary action.
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-hairline bg-base-300 py-2.5 pl-3.5 pr-5 text-body shadow-lg motion-safe:animate-fade-in-up"
            >
              <Icon className={`h-4 w-4 shrink-0 ${TONES[toast.tone]}`} aria-hidden />
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
