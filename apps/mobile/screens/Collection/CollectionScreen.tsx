import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  CARD_CONDITIONS,
  CARD_CONDITION_LABELS,
  LIVE_TCGS,
  TCG_COLORS,
  TCG_SHORT_LABELS,
} from "@cardscan/config";
import type { CardCondition, TcgSlug } from "@cardscan/types";
import { R, T, GUTTER, MIN_TOUCH, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { CardTile } from "@/components/CardTile";
import { GameSwitcher, type GameFilter } from "@/components/GameSwitcher";
import { OptionSheet } from "@/components/OptionSheet";
import { useCollection, useCollectionSummary } from "@/hooks/useCollection";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const CONDITION_OPTIONS = [
  { value: "any" as const, label: "Any condition" },
  ...CARD_CONDITIONS.map((value) => ({ value, label: CARD_CONDITION_LABELS[value] })),
];

/** An active filter, always removable, like the web FilterChip. */
function FilterChip({ label, accent, onRemove }: { label: string; accent?: string; onRemove: () => void }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <Pressable
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={`Remove filter: ${label}`}
      style={[styles.chip, accent ? { borderColor: `${accent}40`, backgroundColor: `${accent}12` } : null]}
    >
      <Text style={[styles.chipText, accent ? { color: accent } : null]}>{label}</Text>
      <Ionicons name="close" size={14} color={C.baseContentMuted} />
    </Pressable>
  );
}

/**
 * Everything the user owns, per docs/design-system.md 5.4: count, search and filters, the game switcher,
 * removable active-filter chips, then a 2-column grid. An empty collection shows only the empty state.
 */
export function CollectionScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<GameFilter>("all");
  const [condition, setCondition] = useState<CardCondition | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const debounced = useDebouncedValue(query).trim();
  const summary = useCollectionSummary();
  const collection = useCollection({
    query: debounced || undefined,
    tcg: game === "all" ? undefined : game,
    condition: condition ?? undefined,
  });
  const entries = collection.data?.pages.flatMap((page) => page.data) ?? [];
  const filtered = Boolean(debounced) || game !== "all" || condition !== null;

  const clearAll = () => {
    setQuery("");
    setGame("all");
    setCondition(null);
  };

  if (summary.data?.totalCards === 0) {
    return (
      <ScreenContainer title="My collection">
        <View style={styles.body}>
          <EmptyState
            icon="layers-outline"
            title="Your collection is empty"
            description="Scan a card to add your first one. Everything you own — quantities, condition and sets — is tracked here."
            action={
              <Button
                label="Scan your first card"
                icon="scan-outline"
                variant="primary"
                onPress={() => router.push("/(tabs)/scan")}
              />
            }
            secondaryAction={
              <Button
                label="Browse the catalog"
                icon="compass-outline"
                variant="secondary"
                onPress={() => router.push("/(tabs)/discover")}
              />
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  const header = (
    <View>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Ionicons name="search-outline" size={18} color={C.baseContentFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your collection"
            placeholderTextColor={C.baseContentFaint}
            style={styles.input}
            accessibilityLabel="Search your collection"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={condition ? "Filters, 1 active" : "Filters"}
          style={styles.filterButton}
        >
          <Ionicons name="options-outline" size={20} color={condition ? C.primary : C.baseContentMuted} />
        </Pressable>
      </View>

      <View style={styles.switcher}>
        <GameSwitcher value={game} onChange={setGame} games={LIVE_TCGS} />
      </View>

      {filtered ? (
        <View style={styles.chips}>
          {debounced ? <FilterChip label={`"${debounced}"`} onRemove={() => setQuery("")} /> : null}
          {game !== "all" ? (
            <FilterChip
              label={TCG_SHORT_LABELS[game as TcgSlug]}
              accent={TCG_COLORS[game as TcgSlug]}
              onRemove={() => setGame("all")}
            />
          ) : null}
          {condition ? (
            <FilterChip label={CARD_CONDITION_LABELS[condition]} onRemove={() => setCondition(null)} />
          ) : null}
          <Pressable onPress={clearAll} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.clear}>Clear all</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const description = summary.data
    ? `${summary.data.totalCards.toLocaleString()} ${summary.data.totalCards === 1 ? "card" : "cards"} · ` +
      `${summary.data.uniqueCards.toLocaleString()} unique · ${summary.data.totalSets.toLocaleString()} ` +
      `${summary.data.totalSets === 1 ? "set" : "sets"}`
    : undefined;

  return (
    <ScreenContainer title="My collection" description={description} scroll={false}>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.card.id}
        numColumns={2}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <CardTile card={item.card} quantity={item.quantity} onPress={() => router.push(`/cards/${item.card.id}`)} />
        )}
        onEndReached={() => collection.hasNextPage && !collection.isFetchingNextPage && collection.fetchNextPage()}
        onEndReachedThreshold={0.6}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          collection.isLoading ? (
            <ActivityIndicator color={C.primary} style={styles.loader} />
          ) : collection.isError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="We couldn't load your collection"
              description="Check your connection and try again."
              action={<Button label="Try again" variant="primary" onPress={() => collection.refetch()} />}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title="Nothing in your collection matches"
              description="Try a shorter search, another game, or clear the filters."
              action={<Button label="Clear all" variant="primary" onPress={clearAll} />}
            />
          )
        }
        ListFooterComponent={
          collection.isFetchingNextPage ? <ActivityIndicator color={C.primary} style={styles.loader} /> : null
        }
      />

      <OptionSheet
        visible={pickerOpen}
        title="Condition"
        options={CONDITION_OPTIONS}
        selected={condition ?? "any"}
        onSelect={(value) => setCondition(value === "any" ? null : value)}
        onClose={() => setPickerOpen(false)}
      />
    </ScreenContainer>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    body: { paddingHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER - 6, paddingBottom: 110 },
    searchRow: { flexDirection: "row", gap: 8, paddingHorizontal: 6 },
    searchField: {
      flex: 1,
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
    filterButton: {
      width: MIN_TOUCH,
      minHeight: MIN_TOUCH,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: R.md,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.base200,
    },
    switcher: { marginTop: 12, marginHorizontal: -(GUTTER - 6) },
    chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12, paddingHorizontal: 6 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingLeft: 12,
      paddingRight: 8,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.base200,
    },
    chipText: { color: C.baseContent, fontSize: T.meta, fontWeight: "600" },
    clear: { color: C.primary, fontSize: T.meta, fontWeight: "700" },
    loader: { marginTop: 24 },
  });
