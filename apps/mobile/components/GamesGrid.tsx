import { useMemo } from "react";
import type { ComponentProps } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SUPPORTED_TCGS, TCG_CATALOG_STATUS, TCG_COLORS, TCG_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { R, S, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { Badge } from "@/components/Badge";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Themed icon per TCG, the mobile counterpart of the web TCG_ICONS (no licensed logos available). */
const TCG_ICONS: Record<TcgSlug, IconName> = {
  pokemon: "flash-outline",
  magic: "color-wand-outline",
  yugioh: "eye-outline",
  lorcana: "sparkles-outline",
  onepiece: "boat-outline",
  digimon: "hardware-chip-outline",
  starwars: "rocket-outline",
  fab: "water-outline",
};

/**
 * The supported games, with an honest label on any whose catalog is not imported yet. Live games open
 * Discover; planned ones are visibly inert. Game colour tints the icon only, like the web grid.
 */
export function GamesGrid() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.grid}>
      {SUPPORTED_TCGS.map((slug) => {
        const color = TCG_COLORS[slug];
        const live = TCG_CATALOG_STATUS[slug] === "live";

        return (
          <Pressable
            key={slug}
            disabled={!live}
            onPress={() => router.push("/(tabs)/discover")}
            accessibilityRole="button"
            accessibilityState={{ disabled: !live }}
            style={({ pressed }) => [styles.tile, !live && styles.inert, pressed && live && styles.pressed]}
          >
            <View style={[styles.icon, { backgroundColor: `${color}1F` }]}>
              <Ionicons name={TCG_ICONS[slug]} size={20} color={color} />
            </View>
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {TCG_LABELS[slug]}
              </Text>
              <View style={styles.badge}>
                <Badge label={live ? "Browsable" : "Coming soon"} tone={live ? "success" : "neutral"} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: GUTTER },
  tile: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.base200,
  },
  inert: { opacity: 0.55 },
  pressed: { backgroundColor: C.base300 },
  icon: { width: 40, height: 40, borderRadius: R.md, alignItems: "center", justifyContent: "center", },
  text: { flex: 1 },
  name: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  badge: { marginTop: 6, alignSelf: "flex-start" },
});
