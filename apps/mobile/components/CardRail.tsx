import { View, ScrollView, StyleSheet } from "react-native";
import type { CatalogCard } from "@/services/catalog";
import { CardTile } from "./CardTile";
import { C, R, S, CARD_ASPECT } from "@/theme";

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

const styles = StyleSheet.create({
  content: { paddingHorizontal: S.xl, gap: 12 },
  skeleton: { borderRadius: R.sm + 2, backgroundColor: C.base300 },
});
