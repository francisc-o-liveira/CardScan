import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@cardscan/config";
import { useAuth } from "@/providers/AuthProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { getGreeting } from "@/utils/greeting";

const SUMMARY_TILES = [
  { label: "Cards", value: "0" },
  { label: "Sets", value: "0" },
  { label: "Value", value: "€0.00" },
];

export function HomeScreen() {
  const { user } = useAuth();

  return (
    <ScreenContainer title="CardScan">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>
          {getGreeting()}, {user?.username}
        </Text>

        <Pressable
          style={({ pressed }) => [styles.scanCard, pressed && styles.scanCardPressed]}
          onPress={() => router.push("/(tabs)/scan")}
        >
          <View>
            <Text style={styles.scanTitle}>Scan a Card</Text>
            <Text style={styles.scanSubtitle}>Identify a card instantly with your camera.</Text>
          </View>
          <View style={styles.scanIcon}>
            <Ionicons name="scan-outline" size={22} color={COLORS.dark.primaryContent} />
          </View>
        </Pressable>

        <View style={styles.tileRow}>
          {SUMMARY_TILES.map((tile) => (
            <View key={tile.label} style={styles.tile}>
              <Text style={styles.tileValue}>{tile.value}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recently Scanned</Text>
        <EmptyState
          icon="scan-outline"
          title="No scans yet"
          description="Cards you scan will show up here."
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24, gap: 20 },
  greeting: { color: COLORS.dark.baseContentMuted, fontSize: 14 },
  scanCard: {
    backgroundColor: "rgba(91,124,250,0.12)",
    borderWidth: 1,
    borderColor: "rgba(91,124,250,0.3)",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scanCardPressed: { opacity: 0.85 },
  scanTitle: { color: COLORS.dark.baseContent, fontSize: 17, fontWeight: "600" },
  scanSubtitle: { color: COLORS.dark.baseContentMuted, fontSize: 13, marginTop: 2, maxWidth: 220 },
  scanIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tileRow: { flexDirection: "row", gap: 12 },
  tile: {
    flex: 1,
    backgroundColor: COLORS.dark.base200,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    borderRadius: 12,
    padding: 14,
  },
  tileValue: { color: COLORS.dark.baseContent, fontSize: 20, fontWeight: "700" },
  tileLabel: { color: COLORS.dark.baseContentMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: { color: COLORS.dark.baseContent, fontSize: 15, fontWeight: "600" },
});
