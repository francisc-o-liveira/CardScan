"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { SIDEBAR_NAV_ITEMS } from "./navConfig";

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-base-300 bg-base-200/60 md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ScanLine className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">CardScan</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {SIDEBAR_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-base-content/70 hover:bg-base-300/60 hover:text-base-content"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-base-300 px-3 py-3">
        <Link
          href="/help"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-base-content/70 hover:bg-base-300/60 hover:text-base-content"
        >
          <HelpCircle className="h-4 w-4" />
          Help
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-base-content/70 hover:bg-base-300/60 hover:text-base-content"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
