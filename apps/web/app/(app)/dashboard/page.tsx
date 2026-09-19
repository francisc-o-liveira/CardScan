"use client";

import Link from "next/link";
import { ScanLine, Layers, Boxes, Wallet, Heart, History } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { getGreeting } from "@/lib/greeting";
import { EmptyState } from "@/components/ui/EmptyState";
import { TCG_LABELS, SUPPORTED_TCGS } from "@cardscan/config";

const SUMMARY_TILES = [
  { label: "Total Cards", value: "0", icon: Layers },
  { label: "Sets", value: "0", icon: Boxes },
  { label: "Estimated Value", value: "€0.00", icon: Wallet },
  { label: "Wishlist", value: "0", icon: Heart },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <p className="text-sm text-base-content/60">
          {getGreeting()}, {user?.username}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Your collection at a glance</h1>
      </div>

      <Link
        href="/scan"
        className="group flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-6 py-5 transition-colors hover:bg-primary/15"
      >
        <div>
          <p className="text-lg font-medium text-base-content">Scan a Card</p>
          <p className="text-sm text-base-content/60">
            Identify a card instantly using your camera.
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-content transition-transform group-hover:scale-105">
          <ScanLine className="h-5 w-5" />
        </span>
      </Link>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SUMMARY_TILES.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-base-300 bg-base-200/60 p-4"
          >
            <tile.icon className="h-4 w-4 text-base-content/40" />
            <p className="mt-3 text-2xl font-semibold">{tile.value}</p>
            <p className="text-xs text-base-content/60">{tile.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-base-300 bg-base-200/40 p-5">
          <h2 className="mb-4 text-sm font-medium text-base-content/80">Recently Scanned</h2>
          <EmptyState
            icon={ScanLine}
            title="No scans yet"
            description="Cards you scan will show up here for quick access."
          />
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-200/40 p-5">
          <h2 className="mb-4 text-sm font-medium text-base-content/80">Collection Progress</h2>
          <div className="flex flex-col gap-4">
            {SUPPORTED_TCGS.map((tcg) => (
              <div key={tcg}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{TCG_LABELS[tcg]}</span>
                  <span className="text-base-content/50">0%</span>
                </div>
                <progress className="progress progress-primary w-full" value={0} max={100} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-base-300 bg-base-200/40 p-5">
        <h2 className="mb-4 text-sm font-medium text-base-content/80">Recent Activity</h2>
        <EmptyState
          icon={History}
          title="Nothing here yet"
          description="Once you start scanning and collecting cards, your activity will appear here."
        />
      </section>
    </div>
  );
}
