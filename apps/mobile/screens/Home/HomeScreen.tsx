import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import { CAPABILITIES } from "@cardscan/config";
import { GamesGrid } from "@/components/GamesGrid";

interface QuickAction {
  label: string;
  hint: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  href: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Scan cards", hint: "Identify with your camera", icon: "scan-outline", href: "/(tabs)/scan" },
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
  const pokemon = useLatestSetCards("pokemon", 10);
  const magic = useLatestSetCards("magic", 10);

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
          <Text style={styles.heroTitle}>Your collection starts with one scan.</Text>
          <Text style={styles.heroBody}>
            Point your camera at a card and CardScan identifies it — name, set and number — then files it away in your collection.
          </Text>
          <View style={styles.heroActions}>
            <View style={styles.heroAction}>
              <Button
                label="Scan a card"
                icon="scan-outline"
                variant="primary"
                onPress={() => router.push("/(tabs)/scan")}
              />
            </View>
            <View style={styles.heroAction}>
              <Button
                label="Explore cards"
                icon="compass-outline"
                variant="secondary"
                onPress={() => router.push("/(tabs)/discover")}
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
              <Ionicons name={action.icon} size={18} color={C.primary} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionHint}>{action.hint}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="New in Pokémon"
          subtitle={pokemon.set?.name ?? "Latest set"}
          onPressLink={() => router.push("/(tabs)/discover")}
        />
        <CardRail
          cards={pokemon.cards}
          isLoading={pokemon.isLoading}
          onPressCard={(card) => router.push(`/cards/${card.id}`)}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="New in Magic"
          subtitle={magic.set?.name ?? "Latest set"}
          onPressLink={() => router.push("/(tabs)/discover")}
        />
        <CardRail
          cards={magic.cards}
          isLoading={magic.isLoading}
          onPressCard={(card) => router.push(`/cards/${card.id}`)}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Your games"
          subtitle="Pokémon and Magic catalogs are imported and searchable today."
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
    padding: 20,
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
  heroBody: {
    marginTop: 8,
    color: C.baseContentMuted,
    fontSize: T.body,
    lineHeight: 21,
  },
  heroActions: { marginTop: 18, flexDirection: "row", gap: 12 },
  heroAction: { flex: 1 },

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
