import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import type { CardPrice, PriceHistoryRange, PriceHistorySeries } from "@cardscan/types";
import { R, S, T, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { usePriceHistory } from "@/hooks/useCatalog";
import { formatDayMonth, formatLongDate, formatPrice } from "@/utils/format";

const RANGES: { value: PriceHistoryRange; label: string }[] = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
];

const CHART_HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 56 };

/** Round, human tick values ($0, $50, $100 ...) spanning [min, max]. Same as the web chart. */
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

function LineChart({ series, C }: { series: PriceHistorySeries; C: Palette }) {
  const styles = useMemo(() => createStyles(C), [C]);
  const [width, setWidth] = useState(0);
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
    return { ticks, y, xy, path, xLabels };
  }, [width, points, series.low, series.high]);

  const pick = (locationX: number) => {
    if (!geometry) return;
    let nearest = 0;
    geometry.xy.forEach((p, i) => {
      if (Math.abs(p.x - locationX) < Math.abs(geometry.xy[nearest]!.x - locationX)) nearest = i;
    });
    setHover(nearest);
  };

  const active = hover !== null && geometry ? geometry.xy[hover] : null;

  return (
    <View
      style={styles.chart}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => pick(event.nativeEvent.locationX)}
      onResponderMove={(event) => pick(event.nativeEvent.locationX)}
      onResponderRelease={() => setHover(null)}
      onResponderTerminate={() => setHover(null)}
    >
      {geometry ? (
        <Svg width={width} height={CHART_HEIGHT} pointerEvents="none">
          {geometry.ticks.map((tick) => (
            <G key={tick}>
              <Line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geometry.y(tick)}
                y2={geometry.y(tick)}
                stroke={C.border}
                strokeWidth={1}
              />
              <SvgText
                x={PAD.left - 8}
                y={geometry.y(tick) + 4}
                textAnchor="end"
                fontSize={11}
                fill={C.baseContentFaint}
              >
                {formatPrice(tick, currency)}
              </SvgText>
            </G>
          ))}
          {geometry.xLabels.map((p, i) => (
            <SvgText
              key={p.date}
              x={p.x}
              y={CHART_HEIGHT - 8}
              textAnchor={
                geometry.xLabels.length === 1 ? "middle" : i === 0 ? "start" : i === geometry.xLabels.length - 1 ? "end" : "middle"
              }
              fontSize={11}
              fill={C.baseContentFaint}
            >
              {formatDayMonth(p.date)}
            </SvgText>
          ))}

          <Path d={geometry.path} fill="none" stroke={C.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {geometry.xy.length === 1 && <Circle cx={geometry.xy[0]!.x} cy={geometry.xy[0]!.y} r={4.5} fill={C.primary} />}

          {active && (
            <>
              <Line x1={active.x} x2={active.x} y1={PAD.top} y2={CHART_HEIGHT - PAD.bottom} stroke={C.borderStrong} strokeWidth={1} />
              <Circle cx={active.x} cy={active.y} r={4.5} fill={C.primary} stroke={C.base100} strokeWidth={2} />
            </>
          )}
        </Svg>
      ) : null}

      {active && (
        <View
          pointerEvents="none"
          style={[styles.tooltip, { left: Math.min(Math.max(active.x - 60, 0), Math.max(width - 120, 0)) }]}
        >
          <Text style={styles.tooltipDate}>{formatLongDate(active.date)}</Text>
          <Text style={styles.tooltipValue}>{formatPrice(active.market, currency)}</Text>
        </View>
      )}
    </View>
  );
}

function PointRow({ label, value, styles }: { label: string; value: string | null; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.pointRow}>
      <Text style={styles.pointLabel}>{label}</Text>
      <Text style={styles.pointValue}>{value ?? "—"}</Text>
    </View>
  );
}

/**
 * Every finish TCGplayer prices for this card. "Market" is TCGplayer's figure from recent
 * completed sales; low/mid/high are current listings. Same content as the web table.
 */
export function MarketPrices({ prices }: { prices: CardPrice[] }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <View>
      <Text style={styles.sectionTitle}>Market prices</Text>
      {prices.length === 0 ? (
        <View style={styles.emptyRow}>
          <Ionicons name="cash-outline" size={16} color={C.baseContentFaint} />
          <Text style={styles.emptyText}>TCGplayer doesn't list a price for this card.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.th, styles.colFinish]}>Finish</Text>
            {["Market", "Low", "Mid", "High"].map((label) => (
              <Text key={label} style={[styles.th, styles.colPrice]}>
                {label}
              </Text>
            ))}
          </View>
          {prices.map((price) => (
            <View key={price.subType} style={[styles.tableRow, styles.tableRowBorder]}>
              <Text style={[styles.td, styles.colFinish, styles.tdStrong]} numberOfLines={2}>
                {price.subType || "Normal"}
              </Text>
              <Text style={[styles.td, styles.colPrice, styles.tdStrong]}>
                {formatPrice(price.market, price.currency) ?? "—"}
              </Text>
              {[price.low, price.mid, price.high].map((amount, i) => (
                <Text key={i} style={[styles.td, styles.colPrice, styles.tdMuted]}>
                  {formatPrice(amount, price.currency) ?? "—"}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Market price history + price points for one card. History is our own: one market-price
 * point per finish per day, recorded by `pnpm sync:prices`, so a young series says so.
 */
export function PriceHistory({ cardId, prices }: { cardId: string; prices: CardPrice[] }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [range, setRange] = useState<PriceHistoryRange>("3m");
  const [finish, setFinish] = useState<string | null>(null);
  const { data, isLoading } = usePriceHistory(cardId, range);

  const series = data?.series ?? [];
  const selected = series.find((s) => s.subType === finish) ?? series[0] ?? null;
  const current = prices.find((price) => price.subType === selected?.subType) ?? prices[0] ?? null;

  if (prices.length === 0) return null;

  const up = (selected?.change?.amount ?? 0) >= 0;

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, styles.titleFlex]}>Market price history</Text>
        {selected?.change ? (
          <View style={styles.change}>
            <Ionicons name={up ? "trending-up" : "trending-down"} size={16} color={up ? C.success : C.error} />
            <Text style={[styles.changeText, { color: up ? C.success : C.error }]}>
              {up ? "+" : "−"}
              {formatPrice(Math.abs(selected.change.amount), selected.currency)} ({up ? "+" : "−"}
              {Math.abs(selected.change.percent).toFixed(2)}%)
            </Text>
          </View>
        ) : null}
      </View>

      {series.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {series.map((s) => {
            const on = s.subType === selected?.subType;
            return (
              <Pressable
                key={s.subType}
                onPress={() => setFinish(s.subType)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.subType || "Normal"}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.panel}>
        {isLoading && !data ? (
          <View style={[styles.chart, styles.center]} />
        ) : selected ? (
          <LineChart series={selected} C={C} />
        ) : (
          <View style={[styles.chart, styles.center]}>
            <Text style={styles.emptyText}>No market price recorded in this range.</Text>
          </View>
        )}
        <View style={styles.ranges}>
          {RANGES.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => setRange(r.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: range === r.value }}
              style={[styles.range, range === r.value && styles.rangeOn]}
            >
              <Text style={[styles.rangeText, range === r.value && styles.rangeTextOn]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {data?.trackedSince && selected && selected.points.length < 7 ? (
        <Text style={styles.note}>
          Price history started {formatLongDate(data.trackedSince)} and grows by one point a day.
        </Text>
      ) : null}

      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, styles.titleFlex]}>Price points</Text>
        <Text style={styles.emptyText}>{current?.subType || "Normal"}</Text>
      </View>
      <View style={styles.panel}>
        <View style={styles.marketRow}>
          <View style={styles.titleFlex}>
            <Text style={styles.marketLabel}>Market price</Text>
            <Text style={styles.note0}>Based on recent TCGplayer sales</Text>
          </View>
          <Text style={styles.marketValue}>{formatPrice(current?.market, current?.currency) ?? "—"}</Text>
        </View>
        <View style={styles.points}>
          <PointRow styles={styles} label="Lowest listing" value={formatPrice(current?.low, current?.currency)} />
          <PointRow styles={styles} label="Median listing" value={formatPrice(current?.mid, current?.currency)} />
          <PointRow styles={styles} label="Highest listing" value={formatPrice(current?.high, current?.currency)} />
        </View>
      </View>

      {selected ? (
        <>
          <Text style={[styles.sectionTitle, styles.snapshotTitle]}>
            {RANGES.find((r) => r.value === range)!.label} snapshot
          </Text>
          <View style={[styles.panel, styles.points]}>
            <PointRow styles={styles} label="Lowest market price" value={formatPrice(selected.low, selected.currency)} />
            <PointRow styles={styles} label="Highest market price" value={formatPrice(selected.high, selected.currency)} />
            <PointRow styles={styles} label="Days recorded" value={String(selected.points.length)} />
          </View>
        </>
      ) : null}
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  sectionTitle: { marginTop: S["2xl"], color: C.baseContent, fontSize: T.section, fontWeight: "700" },
  snapshotTitle: { fontSize: T.body },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  titleFlex: { flex: 1 },
  change: { flexDirection: "row", alignItems: "center", gap: 4 },
  changeText: { fontSize: T.meta, fontWeight: "600" },
  chips: { gap: 6, paddingTop: 12 },
  chip: { paddingHorizontal: 12, minHeight: 32, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: C.border },
  chipOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  chipText: { color: C.baseContentMuted, fontSize: T.meta, fontWeight: "600" },
  chipTextOn: { color: C.primary },
  panel: { marginTop: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: 12 },
  chart: { height: CHART_HEIGHT, width: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  tooltip: {
    position: "absolute",
    top: 0,
    width: 120,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.base300,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tooltipDate: { color: C.baseContentMuted, fontSize: 12 },
  tooltipValue: { color: C.baseContent, fontSize: T.meta, fontWeight: "700" },
  ranges: { marginTop: 12, flexDirection: "row", justifyContent: "center", gap: 4 },
  range: { minWidth: 48, minHeight: 32, alignItems: "center", justifyContent: "center", borderRadius: R.sm, paddingHorizontal: 12 },
  rangeOn: { backgroundColor: C.baseContent },
  rangeText: { color: C.baseContentMuted, fontSize: T.meta, fontWeight: "700" },
  rangeTextOn: { color: C.base100 },
  note: { marginTop: 8, color: C.baseContentFaint, fontSize: 12 },
  note0: { marginTop: 2, color: C.baseContentFaint, fontSize: 12 },
  marketRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12 },
  marketLabel: { color: C.baseContent, fontSize: T.body, fontWeight: "700" },
  marketValue: { color: C.baseContent, fontSize: T.section, fontWeight: "700" },
  points: { borderTopWidth: 0 },
  pointRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  pointLabel: { color: C.baseContentMuted, fontSize: T.meta },
  pointValue: { color: C.baseContent, fontSize: T.meta, fontWeight: "600" },
  emptyRow: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  emptyText: { color: C.baseContentMuted, fontSize: T.meta },
  table: { marginTop: 12 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  th: { color: C.baseContentMuted, fontSize: 12, fontWeight: "600" },
  td: { fontSize: 12 },
  tdStrong: { color: C.baseContent, fontWeight: "700" },
  tdMuted: { color: C.baseContentMuted },
  colFinish: { flex: 1.6 },
  colPrice: { flex: 1, textAlign: "right" },
});
