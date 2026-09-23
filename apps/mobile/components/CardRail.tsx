import { useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import type { CatalogCard } from "@/services/catalog";
import { CardTile } from "./CardTile";
import { R, S, CARD_ASPECT, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";

const TILE_WIDTH = 116;

/** Horizontal card row for home-screen sections. */
export function CardRail({
  cards,
  isLoading,
  onPressCard,
}: {
  cards: CatalogCard[];
  isLoading?: boolean;
  onPressCard?: (card: CatalogCard) => void;
}) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {isLoading
        ? Array.from({ length: 5 }).map((_, index) => (
            <View
              key={index}
              style={[styles.skeleton, { width: TILE_WIDTH, height: TILE_WIDTH / CARD_ASPECT }]}
            />
          ))
        : cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              width={TILE_WIDTH}
              onPress={onPressCard ? () => onPressCard(card) : undefined}
            />
          ))}
    </ScrollView>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  content: { paddingHorizontal: GUTTER, gap: 12 },
  skeleton: { borderRadius: R.sm + 2, backgroundColor: C.base300 },
});
