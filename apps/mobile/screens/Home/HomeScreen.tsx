import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { C, R, S, T } from "@/theme";
import { useAuth } from "@/providers/AuthProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { CardRail } from "@/components/CardRail";
import { Button } from "@/components/Button";
import { useLatestSetCards } from "@/hooks/useCatalog";

interface QuickAction {
  label: string;
  hint: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  href: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Scan cards", hint: "Identify a card", icon: "scan-outline", href: "/(tabs)/scan" },
  { label: "Card database", hint: "Every card, searchable", icon: "albums-outline", href: "/cards" },
  {
    label: "Collection",
    hint: "Everything you own",
    icon: "layers-outline",
    href: "/(tabs)/collection",
  },
  { label: "Discover", hint: "Browse sets", icon: "compass-outline", href: "/(tabs)/discover" },
];

/**
 * Home mirrors the web hero: one sentence on what the product does, one filled
 * button, then real catalog content — not a dashboard of zeroes.
 *
 * Future / Requires Backend Support: collection totals need a /collection
 * endpoint, so the hero stays in its empty-collection state for now.
 */
export function HomeScreen() {
  const { user } = useAuth();
  const pokemon = useLatestSetCards("pokemon", 10);
  const magic = useLatestSetCards("magic", 10);

  return (
    <ScreenContainer title="CardScan">
      <View style={styles.heroWrap}>
        <View style={styles.hero}>
          <Text style={styles.greeting}>Welcome back, {user?.username}</Text>
          <Text style={styles.heroTitle}>Your collection starts with one scan.</Text>
          <Text style={styles.heroBody}>
            Point your camera at a card and CardScan identifies it, then files it away.
          </Text>
          <View style={styles.heroActions}>
            <Button
              label="Scan a card"
              icon="scan-outline"
              variant="primary"
              onPress={() => router.push("/(tabs)/scan")}
            />
            <Button
              label="Explore cards"
              icon="compass-outline"
              variant="secondary"
              onPress={() => router.push("/(tabs)/discover")}
            />
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
        <SectionHeader title="New in Pokémon" subtitle={pokemon.set?.name ?? "Latest set"} />
        <CardRail
          cards={pokemon.cards}
          isLoading={pokemon.isLoading}
          onPressCard={() => router.push("/(tabs)/discover")}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="New in Magic" subtitle={magic.set?.name ?? "Latest set"} />
        <CardRail
          cards={magic.cards}
          isLoading={magic.isLoading}
          onPressCard={() => router.push("/(tabs)/discover")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroWrap: { paddingHorizontal: S.xl },
  hero: {
    backgroundColor: C.base200,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.xl,
    padding: 20,
  },
  greeting: { color: C.baseContentMuted, fontSize: T.meta },
  heroTitle: {
    marginTop: 8,
    color: C.baseContent,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  heroBody: {
    marginTop: 8,
    color: C.baseContentMuted,
    fontSize: T.body,
    lineHeight: 21,
  },
  heroActions: { marginTop: 18, gap: 10 },

  actionsGrid: {
    marginTop: 20,
    paddingHorizontal: S.xl,
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
    padding: 14,
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
});
