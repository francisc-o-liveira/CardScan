import { useState, type ReactNode, useMemo } from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CAPABILITIES } from "@cardscan/config";
import { R, S, T, type Palette, type ThemeName, GUTTER } from "@/theme";
import { useColors, useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";

const TRADEMARK_NOTICE =
  "Pokémon, Magic: The Gathering and the other games listed are trademarks of their respective owners. CardScan is not affiliated with or endorsed by these companies.";

/**
 * Future / Requires Backend Support: Deck tables exist in the schema, but deck building is a later
 * phase and has no API. Same copy as the web page.
 */
export function DecksScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <ScreenContainer title="Decks">
      <View style={styles.body}>
        <EmptyState
          icon="flash-outline"
          title="No decks yet"
          description="Deck building lets you group cards from your collection into lists you can play or trade from."
          action={
            <Button
              label="Browse the catalog"
              icon="compass-outline"
              variant="secondary"
              onPress={() => router.push("/(tabs)/discover")}
            />
          }
        />
        <Text style={styles.note}>
          {CAPABILITIES.decks ? "" : "Deck building is planned for a later release."}
        </Text>
      </View>
    </ScreenContainer>
  );
}

interface Faq {
  question: string;
  answer: string;
}

/** Same answers as the web Help page, including the honest ones about what is not built yet. */
const FAQS: Faq[] = [
  {
    question: "What can I do right now?",
    answer:
      "Search and browse the full Pokémon and Magic: The Gathering catalogs — around 130,000 cards across 1,270 sets, with artwork, set details, rarity and collector numbers. Start from Discover or Search.",
  },
  {
    question: "How does scanning work?",
    answer:
      "Open Scan and hold the card inside the frame. CardScan compares the photo with every card in the catalog and shows the best match; when it isn't sure, it asks you to pick. Each scan, and any correction you make, is kept in Scan history.",
  },
  {
    question: "Why is my collection empty?",
    answer:
      "Saving cards to a collection needs the collection service, which isn't live yet. Nothing you do today is lost — there's simply nothing to save to yet.",
  },
  {
    question: "Which games are supported?",
    answer:
      "Pokémon and Magic: The Gathering are imported and searchable. Yu-Gi-Oh!, Disney Lorcana, One Piece, Digimon, Star Wars: Unlimited and Flesh and Blood are planned — they're listed in the app but marked as coming soon rather than left to look broken.",
  },
  {
    question: "Where do the card images and data come from?",
    answer:
      "Pokémon data comes from TCGdex and Magic data from Scryfall. CardScan syncs from both and stores its own copy, so browsing stays fast.",
  },
];

function FaqItem({ faq, isLast }: { faq: Faq; isLast: boolean }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.faq, !isLast && styles.faqDivider]}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.faqHeader}
      >
        <Text style={styles.faqQuestion}>{faq.question}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.baseContentFaint} />
      </Pressable>
      {open ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
    </View>
  );
}

export function HelpScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <ScreenContainer title="Help" description="What works today, and what's on the way.">
      <View style={styles.body}>
        <View style={styles.panel}>
          {FAQS.map((faq, index) => (
            <FaqItem key={faq.question} faq={faq} isLast={index === FAQS.length - 1} />
          ))}
        </View>

        <View style={[styles.panel, styles.stuck]}>
          <Text style={styles.stuckTitle}>Still stuck?</Text>
          <Text style={styles.stuckBody}>
            Email{" "}
            <Text style={styles.link} onPress={() => Linking.openURL("mailto:support@cardscan.app")}>
              support@cardscan.app
            </Text>{" "}
            and tell us what you were trying to do.
          </Text>
        </View>

        <Text style={styles.legal}>{TRADEMARK_NOTICE}</Text>
      </View>
    </ScreenContainer>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={[styles.panel, styles.groupPanel]}>{children}</View>
    </View>
  );
}

function SettingRow({
  title,
  description,
  control,
  onPress,
  isLast,
}: {
  title: string;
  description?: string;
  control?: ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={[styles.settingRow, !isLast && styles.faqDivider]}
    >
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
      </View>
      {control}
    </Pressable>
  );
}

const THEME_OPTIONS: { value: ThemeName; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { value: "dark", label: "Dark", icon: "moon-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
];

/** Two-option segmented control, like the web one: both states are visible, so the active one is never inferred. */
function ThemeToggle() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { theme, setTheme } = useTheme();

  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel="Theme">
      {THEME_OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => setTheme(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Ionicons name={option.icon} size={14} color={active ? C.baseContent : C.baseContentMuted} />
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Value({ children }: { children: ReactNode }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return <Text style={styles.value}>{children}</Text>;
}

function Chevron() {
  const C = useColors();
  return <Ionicons name="chevron-forward" size={16} color={C.baseContentFaint} />;
}

export function SettingsScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { user } = useAuth();

  return (
    <ScreenContainer title="Settings">
      <View style={styles.body}>
        <SettingsGroup title="Appearance">
          <SettingRow
            title="Theme"
            description="CardScan is designed for dark, where card art reads best."
            control={<ThemeToggle />}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="Account">
          <SettingRow title="Username" control={<Value>{user?.username}</Value>} />
          <SettingRow title="Email" control={<Value>{user?.email}</Value>} />
          <SettingRow
            title="View profile"
            control={<Chevron />}
            onPress={() => router.push("/(tabs)/profile")}
            isLast
          />
        </SettingsGroup>

        {/* Named honestly, with what each one will do — not a vague "more later". */}
        <SettingsGroup title="Not available yet">
          <SettingRow
            title="Notifications"
            description="Price alerts and set release reminders."
            control={<Badge label="Planned" />}
          />
          <SettingRow
            title="Default language"
            description="Which printing to show first for cards with several languages."
            control={<Badge label="Planned" />}
          />
          <SettingRow
            title="Currency"
            description="For market values, once pricing is wired up."
            control={<Badge label="Planned" />}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingRow title="Help" control={<Chevron />} onPress={() => router.push("/(tabs)/help")} />
          <SettingRow title="Version" control={<Value>0.1.0</Value>} isLast />
        </SettingsGroup>

        <Text style={styles.legal}>{TRADEMARK_NOTICE}</Text>
      </View>
    </ScreenContainer>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  body: { paddingHorizontal: GUTTER },
  note: { marginTop: 14, color: C.baseContentFaint, fontSize: T.meta, textAlign: "center" },
  panel: { borderRadius: R.xl, borderWidth: 1, borderColor: C.border, backgroundColor: C.base200 },
  faq: { paddingHorizontal: 18 },
  faqDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  faqHeader: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  faqQuestion: { flex: 1, color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  faqAnswer: { paddingBottom: 16, paddingRight: 24, color: C.baseContentMuted, fontSize: T.body, lineHeight: 22 },
  stuck: { marginTop: 18, padding: 18 },
  stuckTitle: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  stuckBody: { marginTop: 4, color: C.baseContentMuted, fontSize: T.body, lineHeight: 22 },
  link: { color: C.primary },
  legal: { marginTop: 22, color: C.baseContentFaint, fontSize: T.meta, lineHeight: 19 },
  group: { marginTop: 22 },
  groupTitle: {
    marginBottom: 8,
    paddingHorizontal: 4,
    color: C.baseContentFaint,
    fontSize: T.meta,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  groupPanel: { overflow: "hidden" },
  settingRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingText: { flex: 1 },
  settingTitle: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  settingDescription: { marginTop: 2, color: C.baseContentMuted, fontSize: T.meta, lineHeight: 18 },
  value: { color: C.baseContentMuted, fontSize: T.body },
  segmented: {
    flexDirection: "row",
    padding: 4,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.base100,
  },
  segment: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: R.sm,
  },
  segmentActive: { backgroundColor: C.base300 },
  segmentLabel: { color: C.baseContentMuted, fontSize: T.meta, fontWeight: "600" },
  segmentLabelActive: { color: C.baseContent },
});
