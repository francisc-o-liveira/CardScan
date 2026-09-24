import { useMemo } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { S, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { AppHeader } from "@/components/AppHeader";

/** Goes back when there is history, otherwise to `fallback` (deep links land on a bare stack). */
export function BackHeader({ label = "Back", fallback = "/(tabs)" }: { label?: string; fallback?: string }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallback as never));
  return (
    <View>
      <AppHeader />
    <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back" style={styles.row}>
      <Ionicons name="arrow-back" size={18} color={C.baseContentMuted} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  // Same spacing as the web page: 24px above a 36px tall link, 20px below it.
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: GUTTER, paddingTop: S.xl, paddingBottom: 13, minHeight: 73 },
  text: { color: C.baseContentMuted, fontSize: T.meta, fontWeight: "600" },
});
