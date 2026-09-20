"use client";

import Link from "next/link";
import { UserRound, LogOut, ChevronRight, Layers, Boxes, ScanLine } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { SECONDARY_NAV } from "@/components/layout/navConfig";
import { Button } from "@/components/ui/Button";
import { CAPABILITIES } from "@/lib/features";
import { formatMonthYear } from "@/lib/format";

/**
 * Collection totals.
 *
 * Future / Requires Backend Support: no /collection endpoint, so these read
 * zero and say why rather than displaying invented figures.
 */
const STATS = [
  { label: "Cards", value: 0, icon: Layers },
  { label: "Sets", value: 0, icon: Boxes },
  { label: "Scans", value: 0, icon: ScanLine },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const joined = formatMonthYear(user?.createdAt);

  return (
    <PageShell width="narrow">
      <PageHeader title="Profile" />

      <section className="flex items-center gap-4 rounded-panel border border-hairline bg-base-200 p-5 shadow-sheen">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            <UserRound className="h-7 w-7" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-section font-semibold">{user?.username}</h2>
          <p className="truncate text-meta text-muted">{user?.email}</p>
          {joined && <p className="mt-0.5 text-meta text-faint">Collecting since {joined}</p>}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3" aria-label="Collection totals">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-panel border border-hairline bg-base-200 p-4 shadow-sheen"
          >
            <stat.icon className="h-4 w-4 text-faint" aria-hidden />
            <p className="mt-3 text-[1.5rem] font-semibold leading-none tabular-nums">
              {stat.value}
            </p>
            <p className="mt-1 text-meta text-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      {!CAPABILITIES.collection && (
        <p className="mt-2.5 text-meta text-faint">
          These count up once collection tracking ships.
        </p>
      )}

      <nav aria-label="More" className="mt-8">
        <ul className="overflow-hidden rounded-panel border border-hairline bg-base-200">
          {SECONDARY_NAV.map((item, index) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-touch items-center gap-3 px-4 py-3.5 text-body transition-colors duration-fast hover:bg-base-300 ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <item.icon className="h-[1.1rem] w-[1.1rem] shrink-0 text-faint" aria-hidden />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Button variant="danger" onClick={() => logout()} className="mt-6">
        <LogOut className="h-4 w-4" aria-hidden />
        Log out
      </Button>
    </PageShell>
  );
}
