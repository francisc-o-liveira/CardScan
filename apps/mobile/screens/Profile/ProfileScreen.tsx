import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { C, R, S, T, MIN_TOUCH } from "@/theme";
import { useAuth } from "@/providers/AuthProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";

/**
 * Future / Requires Backend Support: totals stay at zero until /collection
 * exists. Shown with a note rather than hidden, so the screen doesn't look
 * broken and no figures are invented.
 */
const STATS = [
  { label: "Cards", value: 0 },
  { label: "Sets", value: 0 },
  { label: "Scans", value: 0 },
];

interface Row {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  href?: string;
}

const ROWS: Row[] = [
  { label: "Wishlist", icon: "heart-outline", href: "/(tabs)/wishlist" },
  { label: "Scan history", icon: "time-outline" },
  { label: "Settings", icon: "settings-outline" },
  { label: "Help", icon: "help-circle-outline" },
];

export function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer title="Profile">
      <View style={styles.body}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={24} color={C.primary} />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.username} numberOfLines={1}>
              {user?.username}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>These count up once collection tracking ships.</Text>

        <View style={styles.rows}>
          {ROWS.map((row, index) => (
            <Pressable
              key={row.label}
              accessibilityRole="button"
              disabled={!row.href}
              onPress={() => row.href && router.push(row.href as never)}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowDivider,
                pressed && row.href ? styles.rowPressed : null,
                !row.href && styles.rowDisabled,
              ]}
            >
              <Ionicons name={row.icon} size={19} color={C.baseContentFaint} />
              <Text style={styles.rowLabel}>{row.label}</Text>
              {row.href ? (
                <Ionicons name="chevron-forward" size={16} color={C.baseContentFaint} />
              ) : (
                <Text style={styles.soon}>Soon</Text>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.logout}>
          <Button label="Log out" icon="log-out-outline" variant="danger" onPress={() => logout()} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: S.xl },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.base200,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: R.md,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: { flex: 1 },
  username: { color: C.baseContent, fontSize: T.section, fontWeight: "700" },
  email: { color: C.baseContentMuted, fontSize: T.meta, marginTop: 2 },

  stats: { flexDirection: "row", gap: 10, marginTop: 14 },
  stat: {
    flex: 1,
    backgroundColor: C.base200,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 14,
  },
  statValue: { color: C.baseContent, fontSize: 24, fontWeight: "700" },
  statLabel: { color: C.baseContentMuted, fontSize: T.meta, marginTop: 2 },
  note: { marginTop: 10, color: C.baseContentFaint, fontSize: T.meta },

  rows: {
    marginTop: 24,
    backgroundColor: C.base200,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    overflow: "hidden",
  },
  row: {
    minHeight: MIN_TOUCH + 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.border },
  rowPressed: { backgroundColor: C.base300 },
  rowDisabled: { opacity: 0.6 },
  rowLabel: { flex: 1, color: C.baseContent, fontSize: T.body },
  soon: { color: C.baseContentFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },

  logout: { marginTop: 24 },
});
