import { useMemo } from "react";
import { Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { useQuota } from "@/hooks/useQuota";

/** How many scans are left, in one quiet line above the camera. Premium shows its badge instead. */
export function QuotaNotice() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { data } = useQuota();
  if (!data) return null;

  if (data.premium) return <Text style={styles.line}>Premium: unlimited scans</Text>;

  const left = (data.freeRemaining ?? 0) + data.credits;
  return (
    <Text style={styles.line} testID="quota-notice">
      <Text style={styles.strong}>{left}</Text> {left === 1 ? "scan" : "scans"} left
      {" · "}
      <Text style={styles.link} onPress={() => router.push("/(tabs)/premium")} accessibilityRole="link">
        Get more scans
      </Text>
    </Text>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  line: { marginHorizontal: GUTTER, marginBottom: 12, color: C.baseContentMuted, fontSize: T.meta },
  strong: { color: C.baseContent, fontWeight: "700" },
  link: { color: C.primary, fontWeight: "600" },
});
