import { useMemo } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import type { Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useHomeRoute } from "@/hooks/useHomeRoute";

export default function Index() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { user, isLoading } = useAuth();
  const homeRoute = useHomeRoute();

  if (isLoading || (user && !homeRoute)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={user ? (homeRoute as "/welcome" | "/(tabs)") : "/(auth)/login"} />;
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.base100,
    },
  });
