import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { TCG_COLORS, TCG_SHORT_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { T, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";

/** Game identity marker: colour is always paired with the game's name, like the web GameBadge. */
export function GameBadge({ tcg }: { tcg: TcgSlug }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const color = TCG_COLORS[tcg];
  return (
    <View style={[styles.pill, { borderColor: `${color}38`, backgroundColor: `${color}14` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{TCG_SHORT_LABELS[tcg]}</Text>
    </View>
  );
}

type Tone = "neutral" | "info" | "success";

const tones = (C: Palette): Record<Tone, { text: string; border: string; background: string }> => ({
  neutral: { text: C.baseContentMuted, border: C.border, background: C.base300 },
  info: { text: C.info, border: `${C.info}40`, background: `${C.info}1F` },
  success: { text: C.success, border: `${C.success}40`, background: `${C.success}1F` },
});

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const colors = tones(C)[tone];
  return (
    <View style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: T.meta - 1, fontWeight: "600" },
});
