import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { S, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";

/** Future / Requires Backend Support: no /wishlist routes yet. */
export function WishlistScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
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
        <Text style={styles.note}>Saving to a wishlist is in development.</Text>
      </View>
    </ScreenContainer>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  body: { paddingHorizontal: GUTTER },
  note: { marginTop: 14, color: C.baseContentFaint, fontSize: T.meta, textAlign: "center" },
});
