"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { CardPrice, PriceHistoryRange, PriceHistorySeries } from "@cardscan/types";
import { usePriceHistory } from "@/hooks/useCatalog";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatLongDate, formatPrice } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

const RANGES: { value: PriceHistoryRange; label: string }[] = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
];

const CHART_HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 56 };

/** Round, human tick values ($0, $50, $100 …) spanning [min, max]. */
const niceTicks = (min: number, max: number, count = 4): number[] => {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  }
  const rough = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!;
  const start = Math.max(0, Math.floor(min / step) * step);
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(2)));
  if (ticks[ticks.length - 1]! < max) ticks.push(Number((ticks[ticks.length - 1]! + step).toFixed(2)));
  return ticks;
};

/** Tracks an element's width so the SVG draws at 1:1 pixels (crisp 2px line, legible text). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function LineChart({ series }: { series: PriceHistorySeries }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const { points, currency } = series;

  const geometry = useMemo(() => {
    if (width === 0 || points.length === 0) return null;
    const ticks = niceTicks(series.low, series.high);
    const yMin = ticks[0]!;
    const yMax = ticks[ticks.length - 1]!;
    const innerW = width - PAD.left - PAD.right;
    const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;
    const t0 = new Date(points[0]!.date).getTime();
    const t1 = new Date(points[points.length - 1]!.date).getTime();
    const x = (date: string) =>
      PAD.left + (t1 === t0 ? innerW / 2 : ((new Date(date).getTime() - t0) / (t1 - t0)) * innerW);
    const y = (value: number) => PAD.top + innerH - ((value - yMin) / (yMax - yMin)) * innerH;
    const xy = points.map((point) => ({ ...point, x: x(point.date), y: y(point.market) }));
    const path = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
    // Up to 5 evenly spaced date labels, always including both ends.
    const labelCount = Math.min(5, xy.length);
    const xLabels =
      labelCount === 1
        ? [xy[0]!]
        : Array.from({ length: labelCount }, (_, i) => xy[Math.round((i * (xy.length - 1)) / (labelCount - 1))]!);
    return { ticks, y, xy, path, xLabels, innerW };
  }, [width, points, series.low, series.high]);

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!geometry) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left;
    let nearest = 0;
    geometry.xy.forEach((p, i) => {
      if (Math.abs(p.x - px) < Math.abs(geometry.xy[nearest]!.x - px)) nearest = i;
    });
    setHover(nearest);
  };

  const active = hover !== null && geometry ? geometry.xy[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height: CHART_HEIGHT }}>
      {geometry && (
        <svg
          width={width}
          height={CHART_HEIGHT}
          className="block touch-none select-none"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
          aria-hidden
        >
          {geometry.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geometry.y(tick)}
                y2={geometry.y(tick)}
                stroke="var(--border-hairline)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={geometry.y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-[color:var(--text-faint)] text-[11px] tabular-nums"
              >
                {formatPrice(tick, currency)}
              </text>
            </g>
          ))}
          {geometry.xLabels.map((p, i) => (
            <text
              key={p.date}
              x={p.x}
              y={CHART_HEIGHT - 8}
              textAnchor={
                geometry.xLabels.length === 1 ? "middle" : i === 0 ? "start" : i === geometry.xLabels.length - 1 ? "end" : "middle"
              }
              className="fill-[color:var(--text-faint)] text-[11px]"
            >
              {formatDayMonth(p.date)}
            </text>
          ))}

          <path d={geometry.path} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {geometry.xy.length === 1 && (
            <circle cx={geometry.xy[0]!.x} cy={geometry.xy[0]!.y} r={4.5} className="fill-primary" />
          )}

          {active && (
            <>
              <line
                x1={active.x}
                x2={active.x}
                y1={PAD.top}
                y2={CHART_HEIGHT - PAD.bottom}
                stroke="var(--border-strong)"
                strokeWidth={1}
              />
              <circle cx={active.x} cy={active.y} r={4.5} className="fill-primary stroke-base-100" strokeWidth={2} />
            </>
          )}
        </svg>
      )}

      {active && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-hairline bg-base-100 px-2.5 py-1.5 text-meta shadow-md"
          style={{
            left: Math.min(Math.max(active.x - 60, 0), width - 120),
            width: 120,
          }}
        >
          <p className="text-[0.75rem] text-muted">{formatLongDate(active.date)}</p>
          <p className="font-semibold tabular-nums text-base-content">{formatPrice(active.market, currency)}</p>
        </div>
      )}
    </div>
  );
}

function PointRow({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-meta text-muted" title={hint}>
        {label}
      </dt>
      <dd className="text-meta font-medium tabular-nums text-base-content">{value ?? "—"}</dd>
    </div>
  );
}

/**
 * Market price history + price points for one card, TCGplayer-style.
 *
 * History is our own: one market-price point per finish per day, recorded by
 * `pnpm sync:prices`. It starts the first day prices were synced — there is no
 * public source for earlier TCGplayer history — so a young series says so
 * rather than drawing a misleadingly flat line.
 */
export function PriceHistory({ cardId, prices }: { cardId: string; prices: CardPrice[] }) {
  const [range, setRange] = useState<PriceHistoryRange>("3m");
  const [finish, setFinish] = useState<string | null>(null);
  const { data, isLoading } = usePriceHistory(cardId, range);

  const series = data?.series ?? [];
  const selected = series.find((s) => s.subType === finish) ?? series[0] ?? null;
  const current = prices.find((price) => price.subType === selected?.subType) ?? prices[0] ?? null;

  if (prices.length === 0) return null;

  return (
    <section className="mt-14">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-section font-semibold">Market price history</h2>
            {selected?.change && (
              <p
                className={cn(
                  "inline-flex items-center gap-1 text-meta font-medium tabular-nums",
                  selected.change.amount >= 0 ? "text-success" : "text-error",
                )}
              >
                {selected.change.amount >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                ) : (
                  <ArrowDownRight className="h-4 w-4" aria-hidden />
                )}
                {selected.change.amount >= 0 ? "+" : "−"}
                {formatPrice(Math.abs(selected.change.amount), selected.currency)} (
                {selected.change.percent >= 0 ? "+" : "−"}
                {Math.abs(selected.change.percent).toFixed(2)}%)
                <span className="sr-only"> over the selected range</span>
              </p>
            )}
          </div>

          {series.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Finish">
              {series.map((s) => (
                <button
                  key={s.subType}
                  type="button"
                  onClick={() => setFinish(s.subType)}
                  aria-pressed={s.subType === selected?.subType}
                  className={cn(
                    "min-h-8 rounded-full border px-3 text-meta font-medium transition-colors duration-fast",
                    s.subType === selected?.subType
                      ? "border-primary bg-[color:var(--primary-soft)] text-primary"
                      : "border-hairline text-muted hover:text-base-content",
                  )}
                >
                  {s.subType || "Normal"}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-panel border border-hairline p-3 sm:p-4">
            {isLoading && !data ? (
              <Skeleton className="h-[220px] w-full rounded-lg" />
            ) : selected ? (
              <LineChart series={selected} />
            ) : (
              <p className="flex h-[220px] items-center justify-center text-meta text-muted">
                No market price recorded in this range.
              </p>
            )}

            <div className="mt-3 flex justify-center gap-1" role="group" aria-label="Range">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  aria-pressed={range === r.value}
                  className={cn(
                    "min-h-8 min-w-12 rounded-lg px-3 text-meta font-semibold transition-colors duration-fast",
                    range === r.value
                      ? "bg-base-content text-base-100"
                      : "text-muted hover:bg-base-200 hover:text-base-content",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {data?.trackedSince && selected && selected.points.length < 7 && (
            <p className="mt-2 text-[0.75rem] text-faint">
              Price history started {formatLongDate(data.trackedSince)} and grows by one point a day.
            </p>
          )}

          {selected && (
            <table className="sr-only">
              <caption>Market price by day, {selected.subType || "Normal"}</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Market price</th>
                </tr>
              </thead>
              <tbody>
                {selected.points.map((point) => (
                  <tr key={point.date}>
                    <td>{formatLongDate(point.date)}</td>
                    <td>{formatPrice(point.market, selected.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-section font-semibold">Price points</h2>
            <span className="text-meta text-muted">{current?.subType || "Normal"}</span>
          </div>

          <div className="mt-4 rounded-panel border border-hairline">
            <div className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-base-content">Market price</p>
                <p className="text-section font-semibold tabular-nums">
                  {formatPrice(current?.market, current?.currency) ?? "—"}
                </p>
              </div>
              <p className="mt-0.5 text-[0.75rem] text-faint">Based on recent TCGplayer sales</p>
            </div>
            <dl className="border-t border-hairline bg-base-200/60 px-4 py-2.5">
              <PointRow label="Lowest listing" value={formatPrice(current?.low, current?.currency)} />
              <PointRow label="Median listing" value={formatPrice(current?.mid, current?.currency)} />
              <PointRow label="Highest listing" value={formatPrice(current?.high, current?.currency)} />
            </dl>
          </div>

          {selected && (
            <>
              <h3 className="mt-6 font-semibold">
                {RANGES.find((r) => r.value === range)!.label} snapshot
              </h3>
              <dl className="mt-2 rounded-panel border border-hairline bg-base-200/60 px-4 py-2.5">
                <PointRow label="Lowest market price" value={formatPrice(selected.low, selected.currency)} />
                <PointRow label="Highest market price" value={formatPrice(selected.high, selected.currency)} />
                <PointRow label="Days recorded" value={String(selected.points.length)} />
              </dl>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
