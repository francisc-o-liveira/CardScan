import { memo, useState, useMemo } from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { resolveImageUrl } from "@/utils/imageUrl";
import { useImageRetry } from "@/hooks/useImageRetry";
import { R, T, CARD_ASPECT, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";

/**
 * Only the fields the tile draws. Declaring them structurally lets it take a
 * full catalog card as well as the narrower rows nested in other responses.
 */
export interface CardTileCard {
  name: string;
  collectorNumber: string;
  rarity: string | null;
  imageUrl: string | null;
  set?: { name: string } | null;
}

interface CardTileProps {
  card: CardTileCard;
  /** Fixed tile width, for rails and fixed-column grids. Omit to fill the column. */
  width?: number;
  quantity?: number;
  showSet?: boolean;
  showRarity?: boolean;
  onPress?: () => void;
}

/**
 * Card artwork with two lines of metadata. Same content rules as the web tile:
 * the art carries the tile, and only name / set / number show at rest.
 */
function CardTileComponent({
  card,
  width,
  quantity,
  showSet = true,
  showRarity = true,
  onPress,
}: CardTileProps) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const uri = resolveImageUrl(card.imageUrl);
  const { attempt, failed: imageFailed, onError: onImageError } = useImageRetry(uri);
  const showImage = Boolean(uri) && !imageFailed;
  const setName = card.set?.name ?? "Unknown set";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${card.name}, ${setName} ${card.collectorNumber}`}
      style={({ pressed }) => [
        width === undefined ? styles.fluid : { width },
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <View
        style={[
          styles.frame,
          width === undefined
            ? { aspectRatio: CARD_ASPECT }
            : { width, height: width / CARD_ASPECT },
        ]}
      >
        {showImage ? (
          <Image
            key={attempt}
            source={{ uri: uri as string }}
            style={styles.image}
            resizeMode="cover"
            accessible
            accessibilityLabel={card.name}
            testID="card-image"
            onError={onImageError}
          />
        ) : (
          <View style={styles.fallback} testID="card-image-fallback">
            <Ionicons name="image-outline" size={18} color={C.baseContentFaint} />
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
          {setName} {"\u00B7"} {card.collectorNumber}
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

const createStyles = (C: Palette) => StyleSheet.create({
  fluid: { flex: 1, padding: 6 },
  pressed: { opacity: 0.8 },
  frame: {
    borderRadius: R.sm + 2,
    overflow: "hidden",
    backgroundColor: C.base300,
  },
  image: { width: "100%", height: "100%" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 8 },
  fallbackText: { color: C.baseContentFaint, fontSize: 11, textAlign: "center" },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: C.primaryContent, fontSize: 11, fontWeight: "700" },
  name: { marginTop: 8, color: C.baseContent, fontSize: T.meta, fontWeight: "600" },
  meta: { marginTop: 2, color: C.baseContentFaint, fontSize: 12 },
  rarity: { marginTop: 1, color: C.baseContentFaint, fontSize: 10, textTransform: "capitalize", opacity: 0.8 },
});
