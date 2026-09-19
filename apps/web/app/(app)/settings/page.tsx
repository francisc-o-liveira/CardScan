"use client";

import { UserRound, LogOut } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/settings/ThemeToggle";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="rounded-2xl border border-base-300 bg-base-200/40 p-5">
        <h2 className="mb-4 text-sm font-medium text-base-content/80">Account</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UserRound className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">{user?.username}</p>
            <p className="text-sm text-base-content/60">{user?.email}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-base-300 bg-base-200/40 p-5">
        <h2 className="mb-4 text-sm font-medium text-base-content/80">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-sm text-base-content/60">Switch between dark and light mode.</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="rounded-2xl border border-base-300 bg-base-200/40 p-5">
        <h2 className="mb-4 text-sm font-medium text-base-content/80">More settings</h2>
        <p className="text-sm text-base-content/60">
          Notification preferences, language, and collected TCGs will be configurable here in a
          future update.
        </p>
      </section>

      <button
        type="button"
        onClick={() => logout()}
        className="btn btn-outline btn-error w-fit gap-2"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </div>
  );
}
