import { useMemo } from "react";
import { ScrollView, Pressable, Text, View, StyleSheet } from "react-native";
import { TCG_COLORS, TCG_SHORT_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { R, S, T, MIN_TOUCH, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";

export type GameFilter = TcgSlug | "all";

/**
 * Game switching, matching the web control one-for-one — same options, same
 * order, same "All games" default — so the two platforms never diverge.
 */
export function GameSwitcher({
  value,
  onChange,
  games,
}: {
  value: GameFilter;
  onChange: (value: GameFilter) => void;
  games: readonly TcgSlug[];
}) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const options: GameFilter[] = ["all", ...games];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const selected = value === option;
        const accent = option === "all" ? undefined : TCG_COLORS[option];
        const label = option === "all" ? "All games" : TCG_SHORT_LABELS[option];

        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected, checked: selected }}
            style={[
              styles.chip,
              selected
                ? accent
                  ? { backgroundColor: accent, borderColor: accent }
                  : styles.chipSelected
                : styles.chipIdle,
            ]}
          >
            {!selected && accent ? (
              <View style={[styles.dot, { backgroundColor: accent }]} />
            ) : null}
            <Text
              style={[
                styles.label,
                selected
                  ? accent
                    ? { color: C.base100 }
                    : { color: C.base100 }
                  : { color: C.baseContentMuted },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  row: { paddingHorizontal: GUTTER, gap: 8, paddingBottom: 4 },
  chip: {
    minHeight: MIN_TOUCH - 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: R.full,
    borderWidth: 1,
  },
  chipIdle: { backgroundColor: C.base200, borderColor: C.border },
  chipSelected: { backgroundColor: C.baseContent, borderColor: C.baseContent },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: T.meta, fontWeight: "600" },
});
