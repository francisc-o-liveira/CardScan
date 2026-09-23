import { useMemo } from "react";
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Scan } from "@cardscan/types";
import { R, T, CARD_ASPECT, GUTTER, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useScanHistory } from "@/hooks/useScans";
import { resolveImageUrl } from "@/utils/imageUrl";
import { formatDateTime } from "@/utils/format";

function ScanRow({ scan }: { scan: Scan }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const card = scan.selectedCard ?? scan.candidates[0]?.card ?? null;
  const photo = resolveImageUrl(scan.imageUrl);

  return (
    <Pressable
      disabled={!card}
      onPress={() => card && router.push(`/cards/${card.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && card ? styles.pressed : null]}
    >
      <View style={styles.photo}>
        {photo ? <Image source={{ uri: photo }} style={styles.photoImage} /> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {card?.name ?? "Not identified"}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {card?.set?.name ? `${card.set.name} · ` : ""}
          {formatDateTime(scan.createdAt)}
        </Text>
        <View style={styles.badge}>
          <Badge label={scan.selectedCard ? "Confirmed" : "Not confirmed"} tone={scan.selectedCard ? "success" : "neutral"} />
        </View>
      </View>
      {card ? <Ionicons name="chevron-forward" size={16} color={C.baseContentFaint} /> : null}
    </Pressable>
  );
}

/** Every card the user has scanned, newest first, with what it was confirmed as. */
export function ScanHistoryScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { data: scans, isLoading, isError, refetch } = useScanHistory();

  return (
    <ScreenContainer title="Scan history">
      <View style={styles.list}>
        {isLoading ? (
          <ActivityIndicator color={C.primary} style={styles.loader} />
        ) : isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="We couldn't load your scans"
            description="Check your connection and try again."
            action={<Button label="Try again" variant="primary" onPress={() => refetch()} />}
          />
        ) : !scans?.length ? (
          <EmptyState
            icon="time-outline"
            title="No scans yet"
            description="Every card you scan is listed here with what CardScan identified it as, so you can correct anything it got wrong."
            action={
              <Button label="Identify a card" icon="scan-outline" variant="primary" onPress={() => router.push("/(tabs)/scan")} />
            }
          />
        ) : (
          scans.map((scan) => <ScanRow key={scan.id} scan={scan} />)
        )}
      </View>
    </ScreenContainer>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    list: { paddingHorizontal: GUTTER, gap: 8 },
    loader: { marginTop: 24 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 10,
      borderRadius: R.lg,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.base200,
    },
    pressed: { opacity: 0.82 },
    photo: {
      width: 48,
      height: 48 / CARD_ASPECT,
      borderRadius: 6,
      overflow: "hidden",
      backgroundColor: C.base300,
    },
    photoImage: { width: "100%", height: "100%" },
    body: { flex: 1 },
    name: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
    meta: { marginTop: 2, color: C.baseContentFaint, fontSize: 12 },
    badge: { marginTop: 6, alignSelf: "flex-start" },
  });
