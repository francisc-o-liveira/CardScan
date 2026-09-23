"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, isNavItemActive } from "./navConfig";
import { cn } from "@/lib/cn";

/**
 * Mobile primary navigation.
 *
 * Scan sits dead centre as a raised, filled button: it is the one action the
 * product is built around, and a new user should be able to find it without
 * reading anything. The other four are labelled icons — never icons alone.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-base-100/95 pb-safe backdrop-blur-xl md:hidden"
    >
      <ul className="flex items-stretch">
        {PRIMARY_NAV.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const isScan = item.href === "/scan";
          const Icon = item.icon;

          if (isScan) {
            return (
              <li key={item.href} className="flex flex-1 justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="group flex min-h-touch flex-col items-center justify-center gap-1 px-2 pb-1.5 pt-2.5"
                >
                  {/* Same footprint as the other tabs' icons so the label shares their baseline; the
                      button is drawn larger and lifted above the bar, ringed in the bar colour. */}
                  <span className="relative h-[1.3rem] w-14">
                    <span
                      className={cn(
                        "absolute -top-7 left-0 flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary text-primary-content shadow-lg ring-4 ring-base-100 transition-transform duration-fast ease-spring",
                        "motion-safe:group-active:scale-90",
                        active && "brightness-110",
                      )}
                    >
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                  </span>
                  <span className="mt-2 text-[0.6875rem] font-bold text-primary">{item.label}</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-touch w-full flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2.5"
              >
                <Icon
                  className={cn(
                    "h-[1.3rem] w-[1.3rem] transition-colors duration-fast",
                    active ? "text-primary" : "text-faint",
                  )}
                  aria-hidden
                  // Filled look for the active tab, so state doesn't rest on colour alone.
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span
                  className={cn(
                    "text-[0.6875rem] transition-colors duration-fast",
                    active ? "font-semibold text-primary" : "text-faint",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
