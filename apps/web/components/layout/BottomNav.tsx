"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_ITEMS } from "./navConfig";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-base-300 bg-base-200/95 backdrop-blur md:hidden">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isScan = item.href === "/scan";
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
            aria-current={isActive ? "page" : undefined}
          >
            {isScan ? (
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isActive ? "bg-primary text-primary-content" : "bg-primary/90 text-primary-content"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
            ) : (
              <Icon
                className={`h-5 w-5 ${isActive ? "text-primary" : "text-base-content/50"}`}
              />
            )}
            <span
              className={`text-[11px] ${isActive ? "text-primary" : "text-base-content/50"}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
