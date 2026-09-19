import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { COLORS } from "@cardscan/config";
import { useAuth } from "@/providers/AuthProvider";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.dark.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dark.base100,
  },
});
