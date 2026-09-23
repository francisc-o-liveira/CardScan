import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { R, GUTTER, MIN_TOUCH, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";

/**
 * Wordmark. The glyph is a card silhouette crossed by a scan line, the same mark as the web Logo.
 */
function Logo() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <Pressable
      onPress={() => router.navigate("/(tabs)")}
      accessibilityRole="link"
      accessibilityLabel="CardScan home"
      style={styles.logo}
    >
      <View style={styles.mark}>
        <View style={styles.markCard}>
          <View style={styles.markLine} />
        </View>
      </View>
      <Text style={styles.wordmark}>CardScan</Text>
    </Pressable>
  );
}

/**
 * The header every screen sits under, like the web app's mobile header: logo on the left, search on
 * the right. Navigation lives in the bottom bar, so nothing else competes for this row.
 */
export function AppHeader() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <View style={styles.header}>
      <Logo />
      <Pressable
        onPress={() => router.navigate("/cards")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Search"
        style={styles.search}
      >
        <Ionicons name="search-outline" size={22} color={C.baseContentMuted} />
      </Pressable>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    header: {
      height: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: GUTTER,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
      backgroundColor: C.base100,
    },
    logo: { flexDirection: "row", alignItems: "center", gap: 10 },
    mark: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    markCard: {
      width: 15,
      height: 19,
      borderRadius: 3,
      borderWidth: 1.8,
      borderColor: C.primaryContent,
      alignItems: "center",
      justifyContent: "center",
    },
    markLine: { position: "absolute", left: -5, right: -5, height: 1.8, borderRadius: 1, backgroundColor: C.primaryContent },
    wordmark: { color: C.baseContent, fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
    search: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center", borderRadius: R.md },
  });
