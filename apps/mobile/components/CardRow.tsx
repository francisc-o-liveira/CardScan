import { useMemo } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CatalogCard, TcgSlug } from "@cardscan/types";
import { R, T, CARD_ASPECT, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { GameBadge } from "@/components/Badge";
import { resolveImageUrl } from "@/utils/imageUrl";

/** One card as a tappable row: thumbnail, name, set and number, game. Used by search and scan results. */
export function CardRow({
  card,
  onPress,
  trailing,
}: {
  card: CatalogCard;
  onPress: () => void;
  /** Replaces the chevron, e.g. a match percentage. */
  trailing?: string;
}) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const uri = resolveImageUrl(card.imageUrl);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, ${card.set?.name ?? "unknown set"}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        {uri ? (
          <Image source={{ uri }} style={styles.thumbImage} />
        ) : (
          <Ionicons name="image-outline" size={16} color={C.baseContentFaint} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {card.set?.name}
          {card.collectorNumber ? ` · #${card.collectorNumber}` : ""}
        </Text>
        {card.tcg?.slug ? (
          <View style={styles.badge}>
            <GameBadge tcg={card.tcg.slug as TcgSlug} />
          </View>
        ) : null}
      </View>
      {trailing ? (
        <Text style={styles.trailing}>{trailing}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={C.baseContentFaint} />
      )}
    </Pressable>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 10,
      borderRadius: R.lg,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.base200,
    },
    pressed: { opacity: 0.82 },
    thumb: {
      width: 44,
      height: 44 / CARD_ASPECT,
      borderRadius: 6,
      overflow: "hidden",
      backgroundColor: C.base300,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbImage: { width: "100%", height: "100%" },
    body: { flex: 1 },
    name: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
    meta: { marginTop: 2, color: C.baseContentFaint, fontSize: 12 },
    badge: { marginTop: 6, alignSelf: "flex-start" },
    trailing: { color: C.baseContentMuted, fontSize: T.meta, fontWeight: "600" },
  });
