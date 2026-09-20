import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CatalogCard } from "@/services/catalog";
import { C, R, T, CARD_ASPECT } from "@/theme";

/**
 * Card artwork with two lines of metadata. Same content rules as the web tile:
 * the art carries the tile, and only name / set / number show at rest.
 */
export function CardTile({
  card,
  width,
  onPress,
}: {
  card: CatalogCard;
  width: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${card.name}, ${card.set?.name ?? "unknown set"}`}
      style={({ pressed }) => [{ width }, pressed && onPress ? styles.pressed : null]}
    >
      <View style={[styles.frame, { width, height: width / CARD_ASPECT }]}>
        {card.imageUrl ? (
          <Image
            source={{ uri: card.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            accessible
            accessibilityLabel={card.name}
          />
        ) : (
          <View style={styles.fallback}>
            <Ionicons name="image-outline" size={18} color={C.baseContentFaint} />
            <Text style={styles.fallbackText} numberOfLines={3}>
              {card.name}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {card.name}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {card.set?.name ?? "Unknown set"}
        {card.collectorNumber ? ` \u00B7 #${card.collectorNumber}` : ""}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  frame: {
    borderRadius: R.sm + 2,
    overflow: "hidden",
    backgroundColor: C.base300,
  },
  image: { width: "100%", height: "100%" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 8 },
  fallbackText: { color: C.baseContentFaint, fontSize: 11, textAlign: "center" },
  name: { marginTop: 8, color: C.baseContent, fontSize: T.meta, fontWeight: "600" },
  meta: { marginTop: 2, color: C.baseContentFaint, fontSize: 12 },
});
