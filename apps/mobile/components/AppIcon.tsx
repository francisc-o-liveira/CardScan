import type { ComponentProps } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

/** Icons the web app draws with Lucide that Ionicons has no twin for, mapped to the closest match. */
const EXTRA = {
  "scan-line": "line-scan",
  swords: "sword-cross",
  history: "history",
  boxes: "cube-outline",
} as const satisfies Record<string, ComponentProps<typeof MaterialCommunityIcons>["name"]>;

export type AppIconName = ComponentProps<typeof Ionicons>["name"] | keyof typeof EXTRA;

const isExtra = (name: AppIconName): name is keyof typeof EXTRA => name in EXTRA;

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: ComponentProps<typeof Ionicons>["style"];
}

export function AppIcon({ name, size = 18, color, style }: AppIconProps) {
  return isExtra(name) ? (
    <MaterialCommunityIcons name={EXTRA[name]} size={size} color={color} style={style} />
  ) : (
    <Ionicons name={name} size={size} color={color} style={style} />
  );
}
