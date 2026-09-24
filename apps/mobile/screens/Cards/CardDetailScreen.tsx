import { useEffect, useMemo, useState } from "react";
import { View, Text, Image, Pressable, Modal, ScrollView, Share, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CAPABILITIES, LANGUAGE_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { R, S, T, CARD_ASPECT, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { BackHeader } from "@/components/BackHeader";
import { Badge, GameBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CardRail } from "@/components/CardRail";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { useCard, useCards } from "@/hooks/useCatalog";
import { useAddToCollection, useCardInCollection } from "@/hooks/useCollection";
import { OwnedCopies } from "@/components/OwnedCopies";
import { BuyLinks } from "@/components/BuyLinks";
import { MarketPrices, PriceHistory } from "@/components/PriceHistory";
import { formatPrice } from "@/utils/format";
import { apiErrorMessage } from "@/utils/apiError";
import { resolveImageUrl } from "@/utils/imageUrl";

const HERO_WIDTH = 288;

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={C.baseContentFaint} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/** Mirrors the web card page: hero art, identity, actions, details, then more from the same set. */
export function CardDetailScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: card, isLoading, isError, refetch } = useCard(id);
  const owned = useCardInCollection(id);
  const addToCollection = useAddToCollection();
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  /** One Near Mint English copy per press, adjustable below in "In your collection". */
  const add = () => {
    if (!card) return;
    addToCollection.mutate(
      { cardId: card.id },
      {
        onSuccess: () => setFeedback({ text: `✓ ${card.name} added to your collection`, ok: true }),
        onError: (error) => setFeedback({ text: apiErrorMessage(error, "Couldn't add the card. Try again."), ok: false }),
      },
    );
  };

  // Related = the rest of this card's set, sampled across it so it is not runs of one card's alternate prints.
  const related = useCards({ setId: card?.setId, limit: 100 }, Boolean(card?.setId));
  const relatedCards = useMemo(() => {
    const pool = (related.data?.data ?? []).filter((item) => item.id !== id);
    if (pool.length <= 14) return pool;
    const step = pool.length / 14;
    return Array.from({ length: 14 }, (_, i) => pool[Math.floor(i * step)]!);
  }, [related.data, id]);

  const languages = Array.from(new Set((card?.variants ?? []).map((variant) => variant.language.toLowerCase())));
  const imageUri = resolveImageUrl(card?.imageUrl);

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <BackHeader fallback="/cards" />
        <EmptyState
          icon="alert-circle-outline"
          title="We couldn't load that card"
          description="The card may have been removed in the last catalog sync, or the connection dropped."
          action={<Button label="Try again" variant="primary" onPress={() => refetch()} />}
          secondaryAction={<Button label="Search for a card" variant="secondary" onPress={() => router.replace("/cards")} />}
        />
      </SafeAreaView>
    );
  }

  const share = () => {
    if (card) {
      Share.share({ message: `${card.name} · ${card.set?.name ?? ""} #${card.collectorNumber}` }).catch(() => undefined);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <BackHeader fallback="/cards" />
      {isLoading || !card ? (
        <View style={styles.loading}>
          <View style={[styles.hero, styles.skeleton]} />
          <View style={[styles.skeleton, { height: 28, width: 220, marginTop: 20 }]} />
          <View style={[styles.skeleton, { height: 14, width: 150, marginTop: 10 }]} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => imageUri && setZoomed(true)}
            disabled={!imageUri}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Enlarge ${card.name}`}
            style={styles.heroWrap}
          >
            <View style={styles.hero}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={styles.noImage}>
                  <Ionicons name="image-outline" size={28} color={C.baseContentFaint} />
                  <Text style={styles.noImageText}>No image</Text>
                </View>
              )}
            </View>
          </Pressable>

          <View style={styles.badges}>
            {card.tcg?.slug && <GameBadge tcg={card.tcg.slug as TcgSlug} />}
            {card.rarity ? <Badge label={card.rarity} /> : null}
            {card.variant ? <Badge label={card.variant} tone="info" /> : null}
          </View>

          <Text style={styles.name}>{card.name}</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.setLink} onPress={() => router.push(`/sets/${card.setId}`)}>
              {card.set?.name}
            </Text>
            {card.collectorNumber ? ` · #${card.collectorNumber}` : ""}
          </Text>

          {card.marketPrice ? (
            <View style={styles.priceLine}>
              <Text style={styles.priceValue}>{formatPrice(card.marketPrice.amount, card.marketPrice.currency)}</Text>
              <Text style={styles.priceCaption}>
                market price{card.marketPrice.subType ? ` · ${card.marketPrice.subType}` : ""}
              </Text>
            </View>
          ) : null}

          {/* Add and Wishlist share a row and Share wraps below, like the web action group. */}
          <View style={styles.actions}>
            <View style={styles.actionsRow}>
              <View style={styles.flex}>
                <Button
                  label="Add to collection"
                  icon="add"
                  variant="primary"
                  isLoading={addToCollection.isPending}
                  onPress={add}
                />
              </View>
              <Button
                label="Wishlist"
                icon="heart-outline"
                variant="secondary"
                onPress={() => undefined}
                disabled={!CAPABILITIES.wishlist}
              />
            </View>
            <View style={styles.shareRow}>
              <Button label="Share" icon="share-outline" variant="ghost" onPress={share} />
            </View>
          </View>
          {/* The phone's counterpart of the web toast. */}
          {feedback ? (
            <Text style={[styles.note, feedback.ok ? styles.noteOk : styles.noteError]}>{feedback.text}</Text>
          ) : null}

          {owned.data ? <OwnedCopies entry={owned.data} /> : null}

          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.details}>
            <DetailRow icon="layers-outline" label="Set" value={card.set?.name ?? "—"} />
            <DetailRow icon="pricetag-outline" label="Number" value={`#${card.collectorNumber}`} />
            <DetailRow icon="ribbon-outline" label="Rarity" value={card.rarity ?? "Not recorded"} />
            <DetailRow
              icon="language-outline"
              label="Languages"
              value={
                languages.length
                  ? languages
                      .map((code) => LANGUAGE_LABELS[code as keyof typeof LANGUAGE_LABELS] ?? code.toUpperCase())
                      .join(", ")
                  : "English"
              }
            />
          </View>

          <MarketPrices prices={card.prices} />
          <BuyLinks links={card.buyLinks} />
          <PriceHistory cardId={card.id} prices={card.prices} />

          {(related.isLoading || relatedCards.length > 0) && (
            <View style={styles.related}>
              <SectionHeader title="More from this set" subtitle={card.set?.name} />
              <CardRail
                cards={relatedCards}
                isLoading={related.isLoading}
                onPressCard={(item) => router.push(`/cards/${item.id}`)}
              />
              <Pressable
                onPress={() => router.push(`/sets/${card.setId}`)}
                accessibilityRole="link"
                style={styles.viewSet}
              >
                <Text style={styles.viewSetText}>View set</Text>
                <Ionicons name="arrow-forward" size={14} color={C.primary} />
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={zoomed} transparent animationType="fade" onRequestClose={() => setZoomed(false)} statusBarTranslucent>
        <Pressable style={styles.lightbox} onPress={() => setZoomed(false)} accessibilityLabel="Close enlarged card">
          {imageUri && <Image source={{ uri: imageUri }} style={styles.lightboxImage} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.base100 },
  flex: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingBottom: 48 },
  loading: { paddingHorizontal: GUTTER, alignItems: "center", paddingTop: S.lg },
  skeleton: { backgroundColor: C.base300, borderRadius: R.md },
  heroWrap: { alignItems: "center", marginTop: S.sm },
  hero: {
    width: HERO_WIDTH,
    aspectRatio: CARD_ASPECT,
    borderRadius: R.lg,
    overflow: "hidden",
    backgroundColor: C.base300,
  },
  heroImage: { width: "100%", height: "100%" },
  noImage: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  noImageText: { color: C.baseContentFaint, fontSize: T.meta },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: S.xl },
  name: { marginTop: 12, color: C.baseContent, fontSize: T.title, fontWeight: "700", letterSpacing: -0.5 },
  priceLine: { marginTop: 16, flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
  priceValue: { color: C.baseContent, fontSize: T.title, fontWeight: "700", letterSpacing: -0.5 },
  priceCaption: { color: C.baseContentMuted, fontSize: T.meta },
  subtitle: { marginTop: 6, color: C.baseContentMuted, fontSize: T.body },
  setLink: { color: C.baseContent, fontWeight: "600", textDecorationLine: "underline" },
  actions: { marginTop: S.xl, gap: 10 },
  actionsRow: { flexDirection: "row", gap: 10 },
  shareRow: { alignSelf: "flex-start" },
  note: { marginTop: 10, color: C.baseContentFaint, fontSize: T.meta, lineHeight: 18 },
  noteOk: { color: C.success },
  noteError: { color: C.error },
  sectionTitle: { marginTop: S["2xl"], color: C.baseContent, fontSize: T.section, fontWeight: "700" },
  details: { marginTop: 4 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  detailLabel: { width: 96, color: C.baseContentMuted, fontSize: T.meta },
  detailValue: { flex: 1, color: C.baseContent, fontSize: T.meta, fontWeight: "600" },
  related: { marginTop: S["2xl"], marginHorizontal: -GUTTER },
  viewSet: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingHorizontal: GUTTER },
  viewSetText: { color: C.primary, fontSize: T.meta, fontWeight: "600" },
  lightbox: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: S.xl,
  },
  lightboxImage: { width: "100%", height: "100%" },
});
