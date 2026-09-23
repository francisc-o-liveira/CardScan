import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { S, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";

interface SectionHeaderProps {
  title: string;
  /** Optional one-liner clarifying what the section contains. */
  subtitle?: string;
  /** "See all" style affordance, text plus chevron so it reads as a link. Same as the web header. */
  onPressLink?: () => void;
  linkLabel?: string;
}

export function SectionHeader({ title, subtitle, onPressLink, linkLabel = "See all" }: SectionHeaderProps) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.container}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onPressLink ? (
        <Pressable onPress={onPressLink} accessibilityRole="link" hitSlop={10} style={styles.link}>
          <Text style={styles.linkText}>{linkLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={C.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: GUTTER,
    marginBottom: 12,
  },
  text: { flex: 1 },
  title: { color: C.baseContent, fontSize: T.section, fontWeight: "700", letterSpacing: -0.2 },
  subtitle: { marginTop: 2, color: C.baseContentMuted, fontSize: T.meta },
  link: { flexDirection: "row", alignItems: "center", gap: 2, paddingBottom: 2 },
  linkText: { color: C.primary, fontSize: T.meta, fontWeight: "600" },
});
