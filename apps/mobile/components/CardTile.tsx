import { memo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CatalogCard } from "@cardscan/types";
import { COLORS } from "@cardscan/config";
import { resolveImageUrl } from "@/utils/imageUrl";

interface CardTileProps {
  card: CatalogCard;
  quantity?: number;
  showSet?: boolean;
  showRarity?: boolean;
  onPress?: () => void;
}

/** Shared card tile — used by the card database now, and by collection/wishlist/scan results later. */
function CardTileComponent({ card, quantity, showSet = true, showRarity = true, onPress }: CardTileProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = resolveImageUrl(card.imageUrl);
  const showImage = Boolean(uri) && !imageFailed;

  return (
    <Pressable
      style={styles.tile}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${card.name}, ${card.set.name} ${card.collectorNumber}`}
    >
      <View style={styles.imageBox}>
        {showImage ? (
          <Image
            source={{ uri: uri as string }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={card.name}
            testID="card-image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.fallback} testID="card-image-fallback">
            <Ionicons name="image-outline" size={22} color={COLORS.dark.baseContentMuted} />
            <Text style={styles.fallbackText}>No image</Text>
          </View>
        )}
        {quantity !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>x{quantity}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {card.name}
      </Text>
      {showSet && (
        <Text style={styles.meta} numberOfLines={1}>
          {card.set.name} · {card.collectorNumber}
        </Text>
      )}
      {showRarity && card.rarity ? (
        <Text style={styles.rarity} numberOfLines={1}>
          {card.rarity}
        </Text>
      ) : null}
    </Pressable>
  );
}

export const CardTile = memo(CardTileComponent);

const styles = StyleSheet.create({
  tile: { flex: 1, padding: 6 },
  imageBox: {
    aspectRatio: 5 / 7,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.dark.base300,
  },
  image: { width: "100%", height: "100%" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  fallbackText: { color: COLORS.dark.baseContentMuted, fontSize: 11 },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: COLORS.dark.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: COLORS.dark.primaryContent, fontSize: 11, fontWeight: "700" },
  name: { color: COLORS.dark.baseContent, fontSize: 12, fontWeight: "600", marginTop: 6 },
  meta: { color: COLORS.dark.baseContentMuted, fontSize: 10, marginTop: 1 },
  rarity: { color: COLORS.dark.baseContentMuted, fontSize: 10, textTransform: "capitalize", opacity: 0.8 },
});
