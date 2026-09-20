import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { S } from "@/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";

/** Future / Requires Backend Support: no /wishlist routes yet. */
export function WishlistScreen() {
  return (
    <ScreenContainer title="Wishlist">
      <View style={styles.body}>
        <EmptyState
          icon="heart-outline"
          title="Nothing on your wishlist yet"
          description="Save the cards you're hunting for and track what they'd cost to close out a set."
          action={
            <Button
              label="Browse the catalog"
              icon="compass-outline"
              variant="primary"
              onPress={() => router.push("/(tabs)/discover")}
            />
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: S.xl },
});
