import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@cardscan/config";
import { useAuth } from "@/providers/AuthProvider";
import { ScreenContainer } from "@/components/ScreenContainer";

export function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer title="Profile">
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={22} color={COLORS.dark.primary} />
        </View>
        <View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        onPress={() => logout()}
      >
        <Ionicons name="log-out-outline" size={18} color={COLORS.dark.error} />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.dark.base200,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(91,124,250,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  username: { color: COLORS.dark.baseContent, fontSize: 16, fontWeight: "600" },
  email: { color: COLORS.dark.baseContentMuted, fontSize: 13, marginTop: 2 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(240,85,90,0.35)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  logoutButtonPressed: { opacity: 0.8 },
  logoutText: { color: COLORS.dark.error, fontSize: 14, fontWeight: "600" },
});
