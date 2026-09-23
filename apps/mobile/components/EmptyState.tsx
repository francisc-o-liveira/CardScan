import { useMemo } from "react";
import type { ComponentProps, ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { R, S, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";

interface EmptyStateProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  /** What's missing. */
  title: string;
  /** Why it matters and what will appear here. */
  description: string;
  /** The one thing to do next — every empty state should offer one. */
  action?: ReactNode;
  secondaryAction?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <Ionicons name={icon} size={24} color={C.baseContentMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action || secondaryAction ? (
        <View style={styles.actions}>
          {action}
          {secondaryAction}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.border,
    borderRadius: R.xl,
    paddingVertical: 44,
    paddingHorizontal: GUTTER,
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: R.lg,
    backgroundColor: C.base300,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: C.baseContent, fontSize: T.section, fontWeight: "600", marginTop: 4 },
  description: {
    color: C.baseContentMuted,
    fontSize: T.body,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 300,
  },
  actions: { marginTop: 14, gap: 10, alignSelf: "stretch" },
});
