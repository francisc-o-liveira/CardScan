import { useMemo } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon, type AppIconName } from "@/components/AppIcon";
import type { ComponentProps } from "react";
import { R, S, T, MIN_TOUCH, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useCollectionSummary } from "@/hooks/useCollection";
import { CAPABILITIES } from "@cardscan/config";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { formatMonthYear } from "@/utils/format";
import { resolveImageUrl } from "@/utils/imageUrl";


interface Row {
  label: string;
  icon: AppIconName;
  href?: string;
}

const ROWS: Row[] = [
  { label: "Wishlist", icon: "heart-outline", href: "/(tabs)/wishlist" },
  { label: "Decks", icon: "swords", href: "/(tabs)/decks" },
  { label: "Scan history", icon: "history", href: "/(tabs)/scan-history" },
  { label: "Settings", icon: "settings-outline", href: "/(tabs)/settings" },
  { label: "Help", icon: "help-circle-outline", href: "/(tabs)/help" },
];

export function ProfileScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { user, logout } = useAuth();
  const { data: summary } = useCollectionSummary();
  const STATS: { label: string; value: number; icon: AppIconName }[] = [
    { label: "Cards", value: summary?.totalCards ?? 0, icon: "layers-outline" },
    { label: "Sets", value: summary?.totalSets ?? 0, icon: "boxes" },
    { label: "Scans", value: summary?.scans ?? 0, icon: "scan-line" },
  ];
  const joined = formatMonthYear(user?.createdAt);
  const avatarUri = resolveImageUrl(user?.avatarUrl);

  return (
    <ScreenContainer title="Profile">
      <View style={styles.body}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person-outline" size={24} color={C.primary} />
            )}
          </View>
          <View style={styles.identityText}>
            <Text style={styles.username} numberOfLines={1}>
              {user?.username}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email}
            </Text>
            {joined ? <Text style={styles.joined}>Collecting since {joined}</Text> : null}
          </View>
        </View>

        <View style={styles.stats}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <AppIcon name={stat.icon} size={16} color={C.baseContentFaint} style={styles.statIcon} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
        {!CAPABILITIES.collection ? (
          <Text style={styles.note}>These count up once collection tracking ships.</Text>
        ) : null}

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
              <AppIcon name={row.icon} size={19} color={C.baseContentFaint} />
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

const createStyles = (C: Palette) => StyleSheet.create({
  body: { paddingHorizontal: GUTTER },
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
  statIcon: { marginBottom: 12 },
  joined: { marginTop: 2, color: C.baseContentFaint, fontSize: T.meta },
  avatarImage: { width: "100%", height: "100%", borderRadius: R.lg },
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

  logout: { marginTop: 24, alignItems: "flex-start" },
});
