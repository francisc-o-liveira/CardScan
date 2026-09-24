import { router } from "expo-router";
import { View, StyleSheet } from "react-native";
import type { TcgSlug } from "@cardscan/types";
import { TCG_LABELS } from "@cardscan/config";
import { S } from "@/theme";
import { CardRail } from "@/components/CardRail";
import { SectionHeader } from "@/components/SectionHeader";
import { useLatestSetCards } from "@/hooks/useCatalog";

/** "New in {game}": the newest set of one game, as a rail. Empty games render nothing. */
export function GameRail({ tcg }: { tcg: TcgSlug }) {
  const latest = useLatestSetCards(tcg, 10);
  if (!latest.isLoading && latest.cards.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={`New in ${TCG_LABELS[tcg]}`}
        subtitle={latest.set?.name ?? "Latest set"}
        onPressLink={() => router.push("/(tabs)/discover")}
      />
      <CardRail
        cards={latest.cards}
        isLoading={latest.isLoading}
        onPressCard={(card) => router.push(`/cards/${card.id}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ section: { marginTop: S["2xl"] } });
