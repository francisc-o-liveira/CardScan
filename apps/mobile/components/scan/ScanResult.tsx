import { useMemo, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { SCAN_CONFIDENT } from "@cardscan/config";
import type { CatalogCard, Scan, TcgSlug } from "@cardscan/types";
import { R, T, CARD_ASPECT, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { Button } from "@/components/Button";
import { GameBadge } from "@/components/Badge";
import { CardRow } from "@/components/CardRow";
import { EmptyState } from "@/components/EmptyState";
import { resolveImageUrl } from "@/utils/imageUrl";

interface ScanResultProps {
  scan: Scan;
  confirming: boolean;
  onConfirm: (card: CatalogCard) => void;
  onRetry: () => void;
  onEnterManually: () => void;
}

/**
 * What the scan found, per the flow in docs/design-system.md: one card to confirm when CardScan is sure,
 * the candidate list when it is not, and a way out ("Enter manually") in every case.
 */
export function ScanResult({ scan, confirming, onConfirm, onRetry, onEnterManually }: ScanResultProps) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [showAll, setShowAll] = useState(false);
  const [best, ...others] = scan.candidates;

  if (!best) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title="We couldn't identify that card"
        description="Try better lighting, or the card fully inside the frame."
        action={<Button label="Try again" icon="scan" variant="primary" onPress={onRetry} />}
        secondaryAction={<Button label="Enter manually" icon="search-outline" variant="secondary" onPress={onEnterManually} />}
      />
    );
  }

  const confident = (scan.confidence ?? 0) >= SCAN_CONFIDENT;

  if (confident && !showAll) {
    const uri = resolveImageUrl(best.card.imageUrl);
    return (
      <View style={styles.panel}>
        <View style={styles.art}>{uri ? <Image source={{ uri }} style={styles.artImage} /> : null}</View>
        <Text style={styles.name}>{best.card.name}</Text>
        <View style={styles.metaRow}>
          {best.card.tcg?.slug ? <GameBadge tcg={best.card.tcg.slug as TcgSlug} /> : null}
          <Text style={styles.meta} numberOfLines={1}>
            {best.card.set?.name}
            {best.card.collectorNumber ? ` · #${best.card.collectorNumber}` : ""}
          </Text>
        </View>
        <Text style={styles.confidence}>{Math.round((scan.confidence ?? 0) * 100)}% sure</Text>
        <View style={styles.actions}>
          <Button
            label="Add to collection"
            icon="add"
            variant="primary"
            isLoading={confirming}
            onPress={() => onConfirm(best.card)}
          />
          <Button label="Not this card" variant="secondary" onPress={() => setShowAll(true)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.listTitle}>Which card is it?</Text>
      <Text style={styles.listHint}>
        {confident ? "Pick the card you scanned to add it." : "CardScan isn't sure. Pick the card you scanned to add it."}
      </Text>
      <View style={styles.list}>
        {(showAll ? others : scan.candidates).map(({ card }) => (
          <CardRow key={card.id} card={card} onPress={() => onConfirm(card)} />
        ))}
      </View>
      <View style={styles.actions}>
        <Button label="None of these — enter manually" icon="search-outline" variant="secondary" onPress={onEnterManually} />
        <Button label="Scan again" icon="scan" variant="ghost" onPress={onRetry} />
      </View>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    panel: {
      padding: 18,
      borderRadius: R.xl,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.base200,
    },
    art: {
      alignSelf: "center",
      width: 180,
      aspectRatio: CARD_ASPECT,
      borderRadius: R.md,
      overflow: "hidden",
      backgroundColor: C.base300,
    },
    artImage: { width: "100%", height: "100%" },
    name: { marginTop: 16, color: C.baseContent, fontSize: T.title - 4, fontWeight: "700", textAlign: "center" },
    metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    meta: { flexShrink: 1, color: C.baseContentMuted, fontSize: T.meta },
    confidence: { marginTop: 8, color: C.baseContentFaint, fontSize: T.meta, textAlign: "center" },
    actions: { marginTop: 18, gap: 10 },
    listTitle: { color: C.baseContent, fontSize: T.section, fontWeight: "700" },
    listHint: { marginTop: 4, color: C.baseContentMuted, fontSize: T.meta },
    list: { marginTop: 14, gap: 8 },
  });
