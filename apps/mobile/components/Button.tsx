import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, R, T, MIN_TOUCH } from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>["name"];
  isLoading?: boolean;
  disabled?: boolean;
}

const TEXT_COLOR: Record<Variant, string> = {
  primary: C.primaryContent,
  secondary: C.baseContent,
  ghost: C.baseContentMuted,
  danger: C.error,
};

/**
 * The app's only button, mirroring the web variants so the action hierarchy
 * reads the same on both platforms: one `primary` per screen.
 */
export function Button({
  label,
  onPress,
  variant = "secondary",
  icon,
  isLoading,
  disabled,
}: ButtonProps): ReactNode {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(isLoading) }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <View style={styles.inner}>
        {isLoading ? (
          <ActivityIndicator size="small" color={TEXT_COLOR[variant]} />
        ) : icon ? (
          <Ionicons name={icon} size={18} color={TEXT_COLOR[variant]} />
        ) : null}
        <Text style={[styles.label, { color: TEXT_COLOR[variant] }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    borderRadius: R.md,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  inner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  label: { fontSize: T.body, fontWeight: "600" },
  primary: { backgroundColor: C.primary, borderColor: C.primary },
  secondary: { backgroundColor: C.base300, borderColor: C.border },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  danger: { backgroundColor: "transparent", borderColor: "rgba(251,113,133,0.35)" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
});
