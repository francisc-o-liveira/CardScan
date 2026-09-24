import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon, type AppIconName } from "@/components/AppIcon";
import type { ComponentProps } from "react";
import { R, S, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { CardRail } from "@/components/CardRail";
import { Button } from "@/components/Button";
import { useLatestSetCards } from "@/hooks/useCatalog";
import { LinearGradient } from "expo-linear-gradient";
import { CAPABILITIES, LIVE_TCGS, SUPPORTED_TCGS, TCG_COLORS, TCG_SHORT_LABELS } from "@cardscan/config";
import { useCollectionSummary } from "@/hooks/useCollection";
import { GamesGrid } from "@/components/GamesGrid";
import { GameRail } from "@/components/GameRail";

interface QuickAction {
  label: string;
  hint: string;
  icon: AppIconName;
  href: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Scan cards", hint: "Identify with your camera", icon: "scan-line", href: "/(tabs)/scan" },
  { label: "Search cards", hint: "By name, set or number", icon: "search-outline", href: "/cards" },
  { label: "My collection", hint: "Everything you own", icon: "layers-outline", href: "/(tabs)/collection" },
  { label: "Discover", hint: "Browse sets and games", icon: "compass-outline", href: "/(tabs)/discover" },
];

/**
 * Home mirrors the web hero: one sentence on what the product does, one filled
 * button, then real catalog content — not a dashboard of zeroes.
 *
 * Future / Requires Backend Support: collection totals need a /collection
 * endpoint, so the hero stays in its empty-collection state for now.
 */
export function HomeScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { user } = useAuth();
  const { data: summary } = useCollectionSummary();
  const totalCards = summary?.totalCards ?? 0;
  const perGame = summary?.perGame ?? {};
  const isEmpty = totalCards === 0;

  return (
    <ScreenContainer>
      <View style={styles.heroWrap}>
        <View style={styles.hero}>
          {/* Soft glow from the top right, like the web hero's blurred primary and accent blobs. */}
          <LinearGradient
            colors={[`${C.primary}33`, `${C.primary}00`, `${C.accent}1A`]}
            locations={[0, 0.55, 1]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
          />
          <Text style={styles.greeting}>Welcome back, {user?.username}</Text>
          {/* Same two states as the web CollectionHero: a pitch when empty, the totals once there are cards. */}
          {isEmpty ? (
            <>
              <Text style={styles.heroTitle}>Your collection starts with one scan.</Text>
              <Text style={styles.heroBody}>
                Point your camera at a card and CardScan identifies it — name, set and number — then files it away in your collection.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.total}>{totalCards.toLocaleString()}</Text>
              <Text style={styles.countLabel}>cards in your collection</Text>
              <View style={styles.perGame}>
                {SUPPORTED_TCGS.filter((slug) => (perGame[slug] ?? 0) > 0).map((slug) => (
                  <View key={slug} style={styles.perGameItem}>
                    <View style={[styles.perGameDot, { backgroundColor: TCG_COLORS[slug] }]} />
                    <Text style={styles.perGameLabel}>{TCG_SHORT_LABELS[slug]}</Text>
                    <Text style={styles.perGameValue}>{(perGame[slug] ?? 0).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          <View style={styles.heroActions}>
            <View style={styles.heroAction}>
              <Button
                label="Scan a card"
                icon="scan-line"
                variant="primary"
                onPress={() => router.push("/(tabs)/scan")}
              />
            </View>
            <View style={styles.heroAction}>
              <Button
                label={isEmpty ? "Explore cards" : "View collection"}
                icon={isEmpty ? "compass-outline" : "layers-outline"}
                variant="secondary"
                onPress={() => router.push(isEmpty ? "/(tabs)/discover" : "/(tabs)/collection")}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.href as never)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          >
            <View style={styles.actionIcon}>
              <AppIcon name={action.icon} size={18} color={C.primary} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionHint}>{action.hint}</Text>
          </Pressable>
        ))}
      </View>

      {LIVE_TCGS.map((tcg) => (
        <GameRail key={tcg} tcg={tcg} />
      ))}

      <View style={styles.section}>
        <SectionHeader
          title="Your games"
          subtitle="Every catalog is imported and searchable."
        />
        <GamesGrid />
      </View>

      {/* Honest about what is not built, with a next step that is. */}
      {!CAPABILITIES.scanning && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Camera scanning is in development</Text>
          <Text style={styles.noticeBody}>
            Until it ships you can find any card by name, set or number and add it by hand.
          </Text>
          <Pressable onPress={() => router.push("/cards")} accessibilityRole="link" style={styles.noticeLink}>
            <Text style={styles.noticeLinkText}>Search the catalog</Text>
            <Ionicons name="arrow-forward" size={14} color={C.primary} />
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  heroWrap: { paddingHorizontal: GUTTER },
  hero: {
    backgroundColor: C.base200,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.xl,
    paddingHorizontal: 20,
    paddingVertical: 32,
    overflow: "hidden",
  },
  greeting: { color: C.baseContentMuted, fontSize: T.meta },
  heroTitle: {
    marginTop: 8,
    color: C.baseContent,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  total: { marginTop: 4, color: C.baseContent, fontSize: 48, fontWeight: "700", lineHeight: 48, letterSpacing: -1 },
  countLabel: { marginTop: 6, color: C.baseContentMuted, fontSize: T.body, lineHeight: 21 },
  perGame: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", columnGap: 20, rowGap: 8 },
  perGameItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  perGameDot: { width: 8, height: 8, borderRadius: 4 },
  perGameLabel: { color: C.baseContentMuted, fontSize: T.meta },
  perGameValue: { color: C.baseContent, fontSize: T.meta, fontWeight: "700" },
  heroBody: {
    marginTop: 12,
    color: C.baseContentMuted,
    fontSize: T.body,
    lineHeight: 21,
  },
  // Buttons size to their label and share the row; when both don't fit, the second wraps below instead of
  // breaking its label over two lines.
  heroActions: { marginTop: 32, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  heroAction: { flexGrow: 1 },

  actionsGrid: {
    marginTop: 20,
    paddingHorizontal: GUTTER,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    // Two per row, accounting for the 10px gap.
    width: "48%",
    flexGrow: 1,
    backgroundColor: C.base200,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 16,
    minHeight: 112,
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.82 },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm + 2,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionLabel: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  actionHint: { marginTop: 2, color: C.baseContentFaint, fontSize: 12 },

  section: { marginTop: 28 },

  notice: {
    marginTop: 28,
    marginHorizontal: GUTTER,
    padding: 18,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.base200,
  },
  noticeTitle: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  noticeBody: { marginTop: 4, color: C.baseContentMuted, fontSize: T.meta, lineHeight: 19 },
  noticeLink: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  noticeLinkText: { color: C.primary, fontSize: T.meta, fontWeight: "600" },
});
