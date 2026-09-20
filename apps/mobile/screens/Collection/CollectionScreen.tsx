import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { C, S, T } from "@/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";

/**
 * Future / Requires Backend Support: no /collection routes exist yet, so this
 * is always empty. It shows a single empty state with two working next steps
 * rather than a search bar and filters over nothing.
 */
export function CollectionScreen() {
  return (
    <ScreenContainer title="My collection">
      <View style={styles.body}>
        <EmptyState
          icon="layers-outline"
          title="Your collection is empty"
          description="Scan a card to add your first one. Quantities, condition and sets are all tracked here."
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
        <Text style={styles.note}>
          Collection tracking is in development — browsing and search work today.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: S.xl },
  note: {
    marginTop: 14,
    color: C.baseContentFaint,
    fontSize: T.meta,
    textAlign: "center",
  },
});
