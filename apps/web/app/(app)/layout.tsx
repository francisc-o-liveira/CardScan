"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Skeleton chrome rather than a spinner: the shell is identical every time,
  // so showing it immediately makes the app feel loaded before the data is.
  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh flex-col bg-base-100">
        <div className="h-16 border-b border-hairline" />
        <div className="mx-auto w-full max-w-content flex-1 px-4 py-8 md:px-8">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-3 h-4 w-80" />
          <Skeleton className="mt-8 h-44 w-full rounded-hero" />
        </div>
        <span className="sr-only" role="status">
          Loading CardScan
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-base-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-content"
      >
        Skip to content
      </a>
      <AppHeader />
      {/* pb-24 clears the fixed mobile bottom bar. */}
      <main id="main" className="flex-1 pb-24 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
