import { useState, useMemo } from "react";
import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { R, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { resolveImageUrl } from "@/utils/imageUrl";

/**
 * A set's publisher symbol, with a fallback: not every symbol URL the catalog sync produces resolves,
 * and a blank tile would look unfinished. Same behaviour as the web SetSymbol.
 */
export function SetSymbol({
  src,
  accent,
  size = "md",
}: {
  src: string | null | undefined;
  /** Game accent, used to tint the placeholder tile. */
  accent?: string;
  size?: "md" | "lg";
}) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [failed, setFailed] = useState(false);
  const uri = resolveImageUrl(src);
  const showImage = Boolean(uri) && !failed;
  const box = size === "lg" ? styles.boxLg : styles.boxMd;
  const glyph = size === "lg" ? 40 : 26;

  return (
    <View style={[styles.base, box, accent && !showImage ? { backgroundColor: `${accent}18` } : null]}>
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          style={{ width: glyph, height: glyph }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons name="layers-outline" size={size === "lg" ? 28 : 20} color={accent ?? C.baseContentFaint} />
      )}
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", backgroundColor: C.base300 },
  boxMd: { width: 44, height: 44, borderRadius: R.md },
  boxLg: { width: 64, height: 64, borderRadius: R.lg },
});
