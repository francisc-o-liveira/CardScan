import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BuyLink } from "@cardscan/types";
import { R, S, T, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";

/**
 * Where to buy the card, same as the web section. The commission notice shows only when at least one of
 * the links really is an affiliate link.
 */
export function BuyLinks({ links }: { links: BuyLink[] }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  if (links.length === 0) return null;
  const hasAffiliate = links.some((link) => link.affiliate);

  return (
    <View>
      <Text style={styles.title}>Where to buy</Text>
      <View style={styles.row}>
        {links.map((link) => (
          <Pressable
            key={link.marketplace}
            onPress={() => Linking.openURL(link.url)}
            accessibilityRole="link"
            accessibilityLabel={`Buy on ${link.label}`}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>{link.label}</Text>
            <Ionicons name="open-outline" size={16} color={C.baseContentMuted} />
          </Pressable>
        ))}
      </View>
      {hasAffiliate ? (
        <Text style={styles.note}>
          Some links are affiliate links: CardScan may earn a commission if you buy, at no extra cost to you.
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  title: { marginTop: S["2xl"], color: C.baseContent, fontSize: T.section, fontWeight: "700" },
  row: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  link: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  pressed: { opacity: 0.8 },
  linkText: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  note: { marginTop: 8, color: C.baseContentFaint, fontSize: 12, lineHeight: 17 },
});
