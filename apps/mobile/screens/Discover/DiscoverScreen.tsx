import { useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LIVE_TCGS } from "@cardscan/config";
import { C, R, S, T, MIN_TOUCH, CARD_ASPECT } from "@/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { CardTile } from "@/components/CardTile";
import { GameSwitcher, type GameFilter } from "@/components/GameSwitcher";
import { Button } from "@/components/Button";
import { useCards } from "@/hooks/useCatalog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const COLUMNS = 2;
const GUTTER = 14;

/**
 * Browse and search the real catalog. This is the mobile counterpart of the
 * web Search + Discover screens folded into one — on a phone, a separate
 * "browse" and "search" destination is a distinction without a difference.
 */
export function DiscoverScreen() {
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<GameFilter>("all");

  const debounced = useDebouncedValue(query);
  const hasQuery = debounced.trim().length >= 2;

  const { data, isLoading, isError, refetch } = useCards(
    {
      query: debounced.trim(),
      tcg: game === "all" ? undefined : game,
      limit: 40,
    },
    hasQuery,
  );

  const cards = data?.data ?? [];
  // Screen padding on both sides plus one gutter between the two columns.
  const tileWidth = (360 - S.xl * 2 - GUTTER) / COLUMNS;

  return (
    <ScreenContainer
      title="Discover"
      description="Search 130,000+ Pokémon and Magic cards."
      scroll={false}
    >
      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <Ionicons name="search-outline" size={18} color={C.baseContentFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Card name, set or number"
            placeholderTextColor={C.baseContentFaint}
            style={styles.input}
            accessibilityLabel="Search cards"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <View style={styles.switcher}>
        <GameSwitcher value={game} onChange={setGame} games={LIVE_TCGS} />
      </View>

      {!hasQuery ? (
        <View style={styles.body}>
          <EmptyState
            icon="search-outline"
            title="Find any card in seconds"
            description="Type a card name to search the full Pokémon and Magic catalogs."
          />
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError ? (
        <View style={styles.body}>
          <EmptyState
            icon="cloud-offline-outline"
            title="We couldn't reach the catalog"
            description="Check your connection and try again."
            action={<Button label="Try again" variant="primary" onPress={() => refetch()} />}
          />
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            icon="search-outline"
            title={`No cards match "${debounced.trim()}"`}
            description="Check the spelling, or try part of the name — 'chariz' works as well as the full name."
            action={
              game !== "all" ? (
                <Button
                  label="Search all games"
                  variant="primary"
                  onPress={() => setGame("all")}
                />
              ) : undefined
            }
          />
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(card) => card.id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.count}>
              {data?.pagination.total.toLocaleString()}{" "}
              {data?.pagination.total === 1 ? "card" : "cards"} found
            </Text>
          }
          renderItem={({ item }) => <CardTile card={item} width={tileWidth} />}
          // Roughly one tile's height; keeps long result lists smooth.
          getItemLayout={(_, index) => {
            const height = tileWidth / CARD_ASPECT + 52;
            return { length: height, offset: height * Math.floor(index / COLUMNS), index };
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: S.xl, paddingBottom: 12 },
  searchField: {
    minHeight: MIN_TOUCH,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.base200,
  },
  input: { flex: 1, color: C.baseContent, fontSize: T.body, paddingVertical: 10 },
  switcher: { paddingBottom: 14 },
  body: { paddingHorizontal: S.xl, paddingTop: 12 },
  centered: { paddingTop: 48, alignItems: "center" },
  list: { paddingHorizontal: S.xl, paddingBottom: 110 },
  row: { gap: GUTTER, marginBottom: 20 },
  count: { color: C.baseContentMuted, fontSize: T.meta, marginBottom: 14 },
});
