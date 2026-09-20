"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, LogOut, Settings, UserRound, ChevronDown } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { DESKTOP_NAV, SECONDARY_NAV, isNavItemActive } from "./navConfig";
import { Logo } from "./Logo";
import { cn } from "@/lib/cn";

/**
 * One header for both breakpoints.
 *
 * Desktop: logo, primary nav, search, avatar. The old build had eight
 * game-specific mega-menus here and no way to reach Home or Collection — the
 * games are now a filter inside Collection and Discover, where they belong.
 *
 * Mobile: logo and a search button only. Navigation lives in the bottom bar,
 * within thumb reach; nothing important hides in a top-right icon.
 */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Cmd/Ctrl-K jumps straight to search — the shortcut collectors expect.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push("/search");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-base-100/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-content items-center gap-3 px-4 md:gap-6 md:px-8">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {DESKTOP_NAV.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-lg px-3 text-body font-medium transition-colors duration-fast",
                  active
                    ? "bg-base-200 text-base-content"
                    : "text-muted hover:bg-base-200/60 hover:text-base-content",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Desktop: a real, obviously clickable search affordance. */}
          <Link
            href="/search"
            className="hidden h-10 w-64 items-center gap-2.5 rounded-xl border border-hairline bg-base-200 px-3.5 text-muted transition-colors duration-fast hover:border-strong lg:flex"
          >
            <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden />
            <span className="grow truncate text-body">Search cards or sets</span>
            <kbd className="hidden shrink-0 rounded border border-hairline bg-base-300 px-1.5 py-0.5 font-sans text-[0.6875rem] text-faint xl:block">
              &#8984;K
            </kbd>
          </Link>

          <Link
            href="/search"
            aria-label="Search cards and sets"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors duration-fast hover:bg-base-200 hover:text-base-content lg:hidden"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>

          <div ref={menuRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex h-10 items-center gap-2 rounded-full border border-hairline py-1 pl-1 pr-2.5 text-body transition-colors duration-fast hover:bg-base-200"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
              <span className="max-w-[8rem] truncate font-medium">{user?.username}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-faint transition-transform duration-fast",
                  menuOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-panel border border-hairline bg-base-200 p-1.5 shadow-lg motion-safe:animate-fade-in-up"
              >
                <div className="px-3 py-2">
                  <p className="truncate text-body font-medium">{user?.username}</p>
                  <p className="truncate text-meta text-faint">{user?.email}</p>
                </div>
                <div className="my-1 h-px bg-hairline" />
                <Link
                  role="menuitem"
                  href="/profile"
                  className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-body text-muted transition-colors duration-fast hover:bg-base-300 hover:text-base-content"
                >
                  <UserRound className="h-4 w-4" aria-hidden />
                  Profile
                </Link>
                {SECONDARY_NAV.filter((item) => item.href !== "/settings").map((item) => (
                  <Link
                    key={item.href}
                    role="menuitem"
                    href={item.href}
                    className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-body text-muted transition-colors duration-fast hover:bg-base-300 hover:text-base-content"
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Link>
                ))}
                <Link
                  role="menuitem"
                  href="/settings"
                  className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-body text-muted transition-colors duration-fast hover:bg-base-300 hover:text-base-content"
                >
                  <Settings className="h-4 w-4" aria-hidden />
                  Settings
                </Link>
                <div className="my-1 h-px bg-hairline" />
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => logout()}
                  className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-body text-muted transition-colors duration-fast hover:bg-base-300 hover:text-error"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
