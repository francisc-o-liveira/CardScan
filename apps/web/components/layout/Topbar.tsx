"use client";

import { Search, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-base-300 bg-base-100/80 px-4 py-3 backdrop-blur md:px-6">
      <label className="input input-bordered input-sm flex w-full max-w-xs items-center gap-2 opacity-60">
        <Search className="h-4 w-4 shrink-0" />
        <input
          type="text"
          className="grow bg-transparent focus:outline-none"
          placeholder="Search (coming soon)"
          disabled
        />
      </label>

      <div className="dropdown dropdown-end">
        <div
          tabIndex={0}
          role="button"
          className="flex items-center gap-2 rounded-full border border-base-300 py-1 pl-1 pr-3 hover:bg-base-200"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UserRound className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-medium sm:inline">{user?.username}</span>
        </div>
        <ul className="dropdown-content menu z-30 mt-2 w-56 rounded-box border border-base-300 bg-base-200 p-2 shadow-lg">
          <li className="px-2 py-1.5 text-xs text-base-content/50">{user?.email}</li>
          <li>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </li>
          <li>
            <button type="button" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
