import { useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { TcgSlug } from "@cardscan/types";
import { R, S, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { BackHeader } from "@/components/BackHeader";
import { GameBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CardTile } from "@/components/CardTile";
import { EmptyState } from "@/components/EmptyState";
import { SetSymbol } from "@/components/SetSymbol";
import { useSet } from "@/hooks/useCatalog";
import { formatLongDate } from "@/utils/format";

const COLUMNS = 2;
const PAGE_SIZE = 40;

/**
 * One set, with its cards. GET /sets/:id returns the whole set in a single response, so filtering and
 * paging happen on the phone, exactly like the web page (which pages, where the phone scrolls).
 */
export function SetDetailScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: set, isLoading, isError, refetch } = useSet(id);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const cards = set?.cards ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter(
      (card) => card.name.toLowerCase().includes(needle) || card.collectorNumber.toLowerCase().includes(needle),
    );
  }, [set?.cards, query]);

  const visible = filtered.slice(0, visibleCount);
  const released = formatLongDate(set?.releaseDate);
  const backTarget = "/(tabs)/discover";

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <BackHeader label="All sets" fallback={backTarget} />
        <EmptyState
          icon="alert-circle-outline"
          title="We couldn't load that set"
          description="Check your connection and try again."
          action={<Button label="Try again" variant="primary" onPress={() => refetch()} />}
          secondaryAction={<Button label="Back to Discover" variant="secondary" onPress={() => router.replace("/(tabs)/discover")} />}
        />
      </SafeAreaView>
    );
  }

  const header = set ? (
    <View>
      <View style={styles.header}>
        <SetSymbol src={set.symbolUrl} size="lg" />
        <View style={styles.headerText}>
          <View style={styles.metaRow}>
            {set.tcg?.slug && <GameBadge tcg={set.tcg.slug as TcgSlug} />}
            <Text style={styles.code}>{set.code}</Text>
          </View>
          <Text style={styles.title}>{set.name}</Text>
          <Text style={styles.subtitle}>
            {set.cards.length.toLocaleString()} cards{released ? ` · Released ${released}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.searchField}>
        <Ionicons name="search-outline" size={18} color={C.baseContentFaint} />
        <TextInput
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Search this set by name or number"
          placeholderTextColor={C.baseContentFaint}
          style={styles.input}
          accessibilityLabel={`Search cards in ${set.name}`}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <BackHeader label="All sets" fallback={backTarget} />
      {isLoading || !set ? (
        <View style={styles.loading}>
          <View style={[styles.skeleton, { height: 64, width: 64 }]} />
          <View style={[styles.skeleton, { height: 26, width: 240, marginTop: 16 }]} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(card) => card.id}
          numColumns={COLUMNS}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CardTile card={item} showSet={false} onPress={() => router.push(`/cards/${item.id}`)} />
          )}
          onEndReached={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length))}
          onEndReachedThreshold={0.6}
          initialNumToRender={12}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No cards match that"
              description={`Nothing in ${set.name} matches "${query}". Try a partial name, or a collector number like 4 or 025.`}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.base100 },
  loading: { paddingHorizontal: GUTTER, paddingTop: S.lg },
  skeleton: { backgroundColor: C.base300, borderRadius: R.md },
  list: { paddingHorizontal: GUTTER - 6, paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 6, paddingTop: S.sm },
  headerText: { flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  code: { color: C.baseContentFaint, fontSize: T.meta - 1, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { marginTop: 6, color: C.baseContent, fontSize: T.title - 4, fontWeight: "700", letterSpacing: -0.4 },
  subtitle: { marginTop: 4, color: C.baseContentMuted, fontSize: T.meta },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 6,
    marginVertical: S.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.base200,
    borderRadius: R.md,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  input: { flex: 1, color: C.baseContent, fontSize: T.body, paddingVertical: 10 },
});
