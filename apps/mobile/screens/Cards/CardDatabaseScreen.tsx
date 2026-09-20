import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { CatalogCard } from "@cardscan/types";
import { COLORS } from "@cardscan/config";
import { CardTile } from "@/components/CardTile";
import { EmptyState } from "@/components/EmptyState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteCards, useSets, useTcgs } from "@/hooks/useCatalog";

/** After a reload or deep link there is no history to go back to, so fall back to Home. */
const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

const PAGE_SIZE = 30;
const COLUMNS = 3;

export function CardDatabaseScreen() {
  const [search, setSearch] = useState("");
  const [tcg, setTcg] = useState("");
  const [setId, setSetId] = useState("");
  const [setPickerOpen, setSetPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const query = useDebouncedValue(search.trim(), 300);
  const tcgs = useTcgs();
  const sets = useSets(tcg || undefined);
  const cards = useInfiniteCards({
    tcg: tcg || undefined,
    setId: setId || undefined,
    query: query || undefined,
    limit: PAGE_SIZE,
  });

  const items = useMemo(() => cards.data?.pages.flatMap((page) => page.data) ?? [], [cards.data]);
  const total = cards.data?.pages[0]?.pagination.total;
  const selectedSet = sets.data?.find((item) => item.id === setId);

  const visibleSets = useMemo(() => {
    const needle = pickerSearch.trim().toLowerCase();
    return (sets.data ?? []).filter((item) => !needle || item.name.toLowerCase().includes(needle));
  }, [sets.data, pickerSearch]);

  const loadMore = useCallback(() => {
    if (cards.hasNextPage && !cards.isFetchingNextPage) cards.fetchNextPage();
  }, [cards]);

  const chooseTcg = (slug: string) => {
    setTcg(slug);
    setSetId("");
  };

  const renderCard = useCallback(({ item }: { item: CatalogCard }) => <CardTile card={item} />, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={COLORS.dark.baseContent} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Card Database</Text>
          <Text style={styles.subtitle} testID="card-total">
            {total !== undefined ? `${total.toLocaleString()} cards` : "Search every card in the catalog"}
          </Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.dark.baseContentMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cards by name..."
          placeholderTextColor={COLORS.dark.baseContentMuted}
          accessibilityLabel="Search cards"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={COLORS.dark.baseContentMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
        <Chip label="All TCGs" selected={tcg === ""} onPress={() => chooseTcg("")} />
        {tcgs.data?.map((item) => (
          <Chip key={item.id} label={item.name} selected={tcg === item.slug} onPress={() => chooseTcg(item.slug)} />
        ))}
      </ScrollView>

      {tcg !== "" && (
        <Pressable
          style={styles.setButton}
          onPress={() => setSetPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filter by set"
        >
          <Text style={styles.setButtonText} numberOfLines={1}>
            {selectedSet ? selectedSet.name : "All sets"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.dark.baseContentMuted} />
        </Pressable>
      )}

      {cards.isError ? (
        <View style={styles.centered} accessibilityRole="alert">
          <Text style={styles.errorText}>
            Couldn&apos;t load cards. {cards.error instanceof Error ? cards.error.message : ""}
          </Text>
          <Pressable style={styles.retry} onPress={() => cards.refetch()} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : cards.isPending ? (
        <View style={styles.centered} testID="cards-loading" accessibilityLabel="Loading cards">
          <ActivityIndicator size="large" color={COLORS.dark.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState icon="albums-outline" title="No cards found" description="Try a different name, or clear the TCG and set filters." />
        </View>
      ) : (
        <FlatList
          testID="card-list"
          data={items}
          renderItem={renderCard}
          keyExtractor={(card) => card.id}
          numColumns={COLUMNS}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            cards.isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={COLORS.dark.primary} testID="cards-loading-more" />
            ) : null
          }
        />
      )}

      <Modal visible={setPickerOpen} animationType="slide" onRequestClose={() => setSetPickerOpen(false)}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Select a set</Text>
            <Pressable onPress={() => setSetPickerOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close set picker">
              <Ionicons name="close" size={26} color={COLORS.dark.baseContent} />
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.dark.baseContentMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search sets..."
              placeholderTextColor={COLORS.dark.baseContentMuted}
              accessibilityLabel="Search sets"
              value={pickerSearch}
              onChangeText={setPickerSearch}
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={[{ id: "", name: "All sets" }, ...visibleSets]}
            keyExtractor={(item) => item.id || "all"}
            renderItem={({ item }) => (
              <Pressable
                style={styles.setRow}
                onPress={() => {
                  setSetId(item.id);
                  setSetPickerOpen(false);
                  setPickerSearch("");
                }}
                accessibilityRole="button"
              >
                <Text style={[styles.setRowText, item.id === setId && styles.setRowSelected]}>{item.name}</Text>
                {item.id === setId && <Ionicons name="checkmark" size={18} color={COLORS.dark.primary} />}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.dark.base100 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.dark.baseContent },
  subtitle: { fontSize: 12, color: COLORS.dark.baseContentMuted, marginTop: 1 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.base200,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: COLORS.dark.baseContent },
  chipScroll: { flexGrow: 0, marginTop: 10 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.base200,
  },
  chipSelected: { backgroundColor: COLORS.dark.primary, borderColor: COLORS.dark.primary },
  chipText: { color: COLORS.dark.baseContentMuted, fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: COLORS.dark.primaryContent },
  setButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.base200,
  },
  setButtonText: { flex: 1, color: COLORS.dark.baseContent, fontSize: 14 },
  list: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 24 },
  footer: { paddingVertical: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyWrap: { padding: 16, marginTop: 12 },
  errorText: { color: COLORS.dark.error, fontSize: 14, textAlign: "center" },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 20, borderRadius: 10, backgroundColor: COLORS.dark.primary },
  retryText: { color: COLORS.dark.primaryContent, fontWeight: "600" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.dark.border,
  },
  setRowText: { color: COLORS.dark.baseContent, fontSize: 15, flex: 1, paddingRight: 8 },
  setRowSelected: { color: COLORS.dark.primary, fontWeight: "600" },
});
