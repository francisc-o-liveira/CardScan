import { useState, useMemo, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LIVE_TCGS } from "@cardscan/config";
import type { CatalogCard, Scan } from "@cardscan/types";
import { R, T, MIN_TOUCH, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { GameSwitcher, type GameFilter } from "@/components/GameSwitcher";
import { Button } from "@/components/Button";
import { CardRow } from "@/components/CardRow";
import { Viewfinder } from "@/components/scan/Viewfinder";
import { ScanResult } from "@/components/scan/ScanResult";
import { useCards } from "@/hooks/useCatalog";
import { useCreateScan } from "@/hooks/useScans";
import { useAddToCollection } from "@/hooks/useCollection";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { apiErrorMessage } from "@/utils/apiError";

/**
 * Identify a card: point the camera at it, or find it by name. Batch-friendly, as docs/design-system.md
 * asks: scan, add to the collection, and the viewfinder re-arms on the same screen for the next card.
 * Every card added from a scan (including one picked by name after "Enter manually") also confirms the
 * scan, which records the correction as recognition feedback.
 */
export function ScannerScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<GameFilter>("all");
  const [scan, setScan] = useState<Scan | null>(null);
  /** The scan waiting for the user to find its card by name, after "Enter manually". */
  const [manualFor, setManualFor] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<CatalogCard | null>(null);
  const searchInput = useRef<TextInput>(null);

  const createScan = useCreateScan();
  const addToCollection = useAddToCollection();

  const debounced = useDebouncedValue(query);
  const hasQuery = debounced.trim().length >= 2;
  const { data, isLoading, isError, refetch } = useCards(
    { query: debounced.trim(), tcg: game === "all" ? undefined : game, limit: 8 },
    hasQuery,
  );
  const matches = data?.data ?? [];

  const rearm = () => {
    setScan(null);
    setManualFor(null);
    createScan.reset();
  };

  const capture = (photoUri: string) => {
    setRecorded(null);
    rearm();
    createScan.mutate(photoUri, { onSuccess: setScan });
  };

  const confirm = (card: CatalogCard) => {
    const scanId = scan?.id ?? manualFor;
    if (!scanId) {
      router.push(`/cards/${card.id}`);
      return;
    }
    // Adds the card and confirms the scan in one request; the viewfinder then re-arms for the next card.
    addToCollection.mutate(
      { cardId: card.id, scanId },
      {
        onSuccess: () => {
          setRecorded(card);
          setQuery("");
          rearm();
        },
      },
    );
  };

  const enterManually = () => {
    setManualFor(scan?.id ?? null);
    setScan(null);
    createScan.reset();
    searchInput.current?.focus();
  };

  return (
    <ScreenContainer title="Identify a card" description="Point your camera at a card, or find it by name.">
      <View style={styles.top}>
        {recorded ? (
          <View style={styles.recorded}>
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
            <Text style={styles.recordedText} numberOfLines={1}>
              {recorded.name} added to your collection
            </Text>
            <Pressable onPress={() => router.push(`/cards/${recorded.id}`)} accessibilityRole="link" hitSlop={8}>
              <Text style={styles.link}>View card</Text>
            </Pressable>
          </View>
        ) : null}

        {createScan.isError ? (
          <EmptyState
            icon="alert-circle-outline"
            title="We couldn't identify that card"
            description={apiErrorMessage(createScan.error, "Try better lighting, or the card fully inside the frame.")}
            action={<Button label="Try again" icon="scan" variant="primary" onPress={rearm} />}
            secondaryAction={
              <Button label="Enter manually" icon="search-outline" variant="secondary" onPress={enterManually} />
            }
          />
        ) : scan ? (
          <ScanResult
            scan={scan}
            confirming={addToCollection.isPending}
            onConfirm={confirm}
            onRetry={rearm}
            onEnterManually={enterManually}
          />
        ) : (
          <Viewfinder busy={createScan.isPending} onCapture={capture} />
        )}
      </View>

      <Text style={styles.sectionTitle}>Find it by name</Text>
      {manualFor ? (
        <View style={styles.manual}>
          <Text style={styles.manualText}>Search for the card you scanned, then tap it.</Text>
          <Pressable onPress={() => setManualFor(null)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <Ionicons name="search-outline" size={18} color={C.baseContentFaint} />
          <TextInput
            ref={searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Type a card name, like Charizard"
            placeholderTextColor={C.baseContentFaint}
            style={styles.input}
            accessibilityLabel="Find a card by name"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <View style={styles.switcher}>
        <GameSwitcher value={game} onChange={setGame} games={LIVE_TCGS} />
      </View>

      <View style={styles.results}>
        {!hasQuery ? (
          <Text style={styles.hint}>Start typing to search 130,000+ Pokémon and Magic cards.</Text>
        ) : isLoading ? (
          <ActivityIndicator color={C.primary} style={styles.loader} />
        ) : isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="We couldn't identify that card"
            description="The catalog didn't respond. Check your connection and try again."
            action={<Button label="Try again" variant="primary" onPress={() => refetch()} />}
          />
        ) : matches.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No card by that name"
            description="Try a shorter search — part of the name is enough, and spelling counts more than capitals."
          />
        ) : (
          matches.map((card) => <CardRow key={card.id} card={card} onPress={() => confirm(card)} />)
        )}
      </View>
    </ScreenContainer>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    top: { paddingHorizontal: GUTTER, gap: 12 },
    recorded: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: R.lg,
      borderWidth: 1,
      borderColor: `${C.success}40`,
      backgroundColor: `${C.success}14`,
    },
    recordedText: { flex: 1, color: C.baseContent, fontSize: T.body, fontWeight: "600" },
    link: { color: C.primary, fontSize: T.meta, fontWeight: "700" },
    manual: {
      marginHorizontal: GUTTER,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: R.lg,
      backgroundColor: C.primarySoft,
    },
    manualText: { flex: 1, color: C.baseContent, fontSize: T.meta },
    sectionTitle: {
      marginTop: 28,
      paddingHorizontal: GUTTER,
      color: C.baseContent,
      fontSize: T.section,
      fontWeight: "700",
      marginBottom: 12,
    },
    searchWrap: { paddingHorizontal: GUTTER },
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
    switcher: { marginTop: 12 },
    results: { paddingHorizontal: GUTTER, marginTop: 18, gap: 8 },
    hint: { color: C.baseContentFaint, fontSize: T.meta },
    loader: { marginTop: 20 },
  });
