import { useState } from "react";
import { View, Text, TextInput, Image, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LIVE_TCGS } from "@cardscan/config";
import { C, R, S, T, MIN_TOUCH, CARD_ASPECT } from "@/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { GameSwitcher, type GameFilter } from "@/components/GameSwitcher";
import { Button } from "@/components/Button";
import { useCards } from "@/hooks/useCatalog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const FRAME_WIDTH = 150;

/**
 * Identify a card.
 *
 * Future / Requires Backend Support: camera recognition needs a /scans
 * endpoint and a model, so the viewfinder is shown in its coming-soon state
 * and the working half of the job — find the card, see the real artwork — is
 * given the same weight below it.
 */
export function ScannerScreen() {
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<GameFilter>("all");

  const debounced = useDebouncedValue(query);
  const hasQuery = debounced.trim().length >= 2;

  const { data, isLoading, isError, refetch } = useCards(
    {
      query: debounced.trim(),
      tcg: game === "all" ? undefined : game,
      limit: 8,
    },
    hasQuery,
  );

  const matches = data?.data ?? [];

  return (
    <ScreenContainer title="Identify a card" description="Find any card, or scan one once that ships.">
      <View style={styles.viewfinderWrap}>
        <View style={styles.viewfinder}>
          <View style={[styles.frame, { width: FRAME_WIDTH, height: FRAME_WIDTH / CARD_ASPECT }]}>
            {/* Corner brackets — the universal "align here" signal. */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <View style={styles.frameInner}>
              <Ionicons name="camera-outline" size={26} color="rgba(255,255,255,0.32)" />
              <Text style={styles.frameLabel}>Coming soon</Text>
            </View>
          </View>
          <Text style={styles.caption}>Camera scanning is in development</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Find it by name</Text>

      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <Ionicons name="search-outline" size={18} color={C.baseContentFaint} />
          <TextInput
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
          <Text style={styles.hint}>
            Start typing to search 130,000+ Pokémon and Magic cards.
          </Text>
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
            description="Try a shorter search — part of the name is enough."
          />
        ) : (
          matches.map((card) => (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={`${card.name}, ${card.set?.name ?? "unknown set"}`}
              style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
            >
              <View style={styles.thumb}>
                {card.imageUrl ? (
                  <Image source={{ uri: card.imageUrl }} style={styles.thumbImage} />
                ) : (
                  <Ionicons name="image-outline" size={16} color={C.baseContentFaint} />
                )}
              </View>
              <View style={styles.resultBody}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {card.name}
                </Text>
                <Text style={styles.resultMeta} numberOfLines={1}>
                  {card.set?.name}
                  {card.collectorNumber ? ` · #${card.collectorNumber}` : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.baseContentFaint} />
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  viewfinderWrap: { paddingHorizontal: S.xl },
  viewfinder: {
    backgroundColor: "#08080B",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.xl,
    paddingVertical: 28,
    alignItems: "center",
    gap: 18,
  },
  frame: {
    borderRadius: R.sm + 2,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  frameInner: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  frameLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  corner: { position: "absolute", width: 28, height: 28, borderColor: C.primary },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8 },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  caption: { color: "rgba(255,255,255,0.65)", fontSize: T.body, textAlign: "center" },

  sectionTitle: {
    marginTop: 28,
    paddingHorizontal: S.xl,
    color: C.baseContent,
    fontSize: T.section,
    fontWeight: "700",
    marginBottom: 12,
  },
  searchWrap: { paddingHorizontal: S.xl },
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

  results: { paddingHorizontal: S.xl, marginTop: 18, gap: 8 },
  hint: { color: C.baseContentFaint, fontSize: T.meta },
  loader: { marginTop: 20 },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.base200,
  },
  resultPressed: { opacity: 0.82 },
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
  resultBody: { flex: 1 },
  resultName: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  resultMeta: { marginTop: 2, color: C.baseContentFaint, fontSize: 12 },
});
