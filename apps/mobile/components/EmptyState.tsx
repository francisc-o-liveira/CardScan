import { View, Text, StyleSheet } from "react-native";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@cardscan/config";

interface EmptyStateProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <Ionicons name={icon} size={24} color={COLORS.dark.baseContentMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.dark.border,
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.dark.base300,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.dark.baseContent, fontSize: 16, fontWeight: "600" },
  description: {
    color: COLORS.dark.baseContentMuted,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 280,
  },
});
