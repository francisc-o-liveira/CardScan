import { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LIVE_TCGS, TCG_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { R, S, T, MIN_TOUCH, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { CardRail } from "@/components/CardRail";
import { SetTile } from "@/components/SetTile";
import { GameSwitcher, type GameFilter } from "@/components/GameSwitcher";
import { Button } from "@/components/Button";
import { useSets, useLatestSetCards } from "@/hooks/useCatalog";

/**
 * Browse every set and card in the imported games. Mirrors the web Discover page: pick a game, see its
 * newest set, then filter the full list of sets. Searching cards by name lives in the Card database.
 */
export function DiscoverScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  // Like the web page, "All games" falls back to the first game: sets are listed per game.
  const [game, setGame] = useState<TcgSlug>("pokemon");
  const [setQuery, setSetQuery] = useState("");

  const setsQuery = useSets(game);
  const newest = useLatestSetCards(game, 12);

  // Sets come ordered by release date from the API; one game returns them all in a single response.
  const sets = useMemo(() => {
    const all = setsQuery.data ?? [];
    const needle = setQuery.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((set) => set.name.toLowerCase().includes(needle) || set.code.toLowerCase().includes(needle));
  }, [setsQuery.data, setQuery]);

  const changeGame = (next: GameFilter) => {
    setSetQuery("");
    setGame(next === "all" ? "pokemon" : next);
  };

  return (
    <ScreenContainer title="Discover" description="Browse every set and card in the games CardScan has imported.">
      <View style={styles.switcher}>
        <GameSwitcher value={game} onChange={changeGame} games={LIVE_TCGS} />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recently released"
          subtitle={newest.set?.name ?? "Loading the latest set"}
          onPressLink={newest.set ? () => router.push(`/sets/${newest.set!.id}`) : undefined}
          linkLabel="View set"
        />
        <CardRail
          cards={newest.cards}
          isLoading={newest.isLoading}
          onPressCard={(card) => router.push(`/cards/${card.id}`)}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="All sets"
          subtitle={setsQuery.data ? `${setsQuery.data.length.toLocaleString()} ${TCG_LABELS[game]} sets` : undefined}
        />

        <View style={styles.searchWrap}>
          <View style={styles.searchField}>
            <Ionicons name="search-outline" size={18} color={C.baseContentFaint} />
            <TextInput
              value={setQuery}
              onChangeText={setSetQuery}
              placeholder="Filter sets by name or code"
              placeholderTextColor={C.baseContentFaint}
              style={styles.input}
              accessibilityLabel={`Filter ${TCG_LABELS[game]} sets`}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {setsQuery.isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={C.primary} />
          </View>
        )}

        {setsQuery.isError && (
          <EmptyState
            icon="cloud-offline-outline"
            title="We couldn't load the sets"
            description="Check your connection and try again."
            action={<Button label="Try again" variant="primary" onPress={() => setsQuery.refetch()} />}
          />
        )}

        {setsQuery.data && sets.length === 0 && (
          <EmptyState
            icon="compass-outline"
            title="No sets match that"
            description={`Nothing in ${TCG_LABELS[game]} matches "${setQuery}". Try a shorter search or a set code like BS or LEA.`}
          />
        )}

        {sets.map((set) => (
          <SetTile key={set.id} set={set} />
        ))}
      </View>
    </ScreenContainer>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  switcher: { paddingBottom: 24 },
  section: { marginBottom: 32 },
  searchWrap: { paddingHorizontal: GUTTER, paddingBottom: 14 },
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
  centered: { paddingTop: 24, alignItems: "center" },
});
