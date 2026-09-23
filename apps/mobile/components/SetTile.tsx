import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { TCG_COLORS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { R, S, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import type { CatalogSet } from "@/services/catalog";
import { SetSymbol } from "./SetSymbol";
import { formatMonthYear } from "@/utils/format";

/**
 * A set in a browse list. The publisher's own set symbol leads because it is what collectors recognise;
 * the code and card count are the facts that help someone choose. Same content as the web SetTile.
 */
export function SetTile({ set }: { set: CatalogSet }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const slug = set.tcg?.slug as TcgSlug | undefined;
  const accent = slug ? TCG_COLORS[slug] : undefined;
  const released = formatMonthYear(set.releaseDate);

  return (
    <Pressable
      onPress={() => router.push(`/sets/${set.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${set.name}, ${set.code.toUpperCase()}`}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <SetSymbol src={set.symbolUrl} accent={accent} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {set.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {set.code.toUpperCase()}
          {released ? ` · ${released}` : ""}
          {set.totalCards ? ` · ${set.totalCards.toLocaleString()} cards` : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: GUTTER,
    marginBottom: 10,
    padding: 14,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.base200,
  },
  pressed: { backgroundColor: C.base300 },
  text: { flex: 1 },
  name: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  meta: { marginTop: 2, color: C.baseContentFaint, fontSize: T.meta },
});
