import { useState, type ReactNode, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { R, S, T, CARD_ASPECT, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { Button } from "@/components/Button";
import { markOnboardingSeen } from "@/utils/onboarding";

const createStyles = (C: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.base100, paddingHorizontal: 20, paddingVertical: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { color: C.baseContent, fontSize: T.body, fontWeight: "700" },
  skip: { color: C.baseContentMuted, fontSize: T.meta, fontWeight: "600", paddingHorizontal: 12, paddingVertical: 8 },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  visual: { minHeight: 240, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 40, color: C.baseContent, fontSize: T.title, fontWeight: "700", letterSpacing: -0.5, textAlign: "center" },
  body: { marginTop: 12, maxWidth: 340, color: C.baseContentMuted, fontSize: T.body, lineHeight: 22, textAlign: "center" },
  footer: { gap: 20 },
  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.borderStrong },
  dotActive: { width: 24, backgroundColor: C.primary },
  actions: { gap: 10 },
  fan: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 12 },
  fanCard: { width: 84, aspectRatio: CARD_ASPECT, borderRadius: R.md, borderWidth: 1 },
  frame: {
    width: 150,
    aspectRatio: CARD_ASPECT,
    borderRadius: R.lg,
    borderWidth: 1,
    // The viewfinder stays dark in both themes, like the web ScanFrame.
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#08080B",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: S.md,
  },
  frameCaption: { color: "rgba(255,255,255,0.45)", fontSize: T.meta - 1, textAlign: "center" },
  sparkle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
});

interface Slide {
  title: string;
  body: string;
  visual: ReactNode;
}

/**
 * Three screens, not ten. Each states one fact in the user's own words and every screen can be
 * skipped, exactly like the web welcome flow.
 */
const buildSlides = (styles: ReturnType<typeof createStyles>, C: Palette): Slide[] => [
  {
    title: "Your cards. Organised.",
    body: "Keep your Pokémon, Yu-Gi-Oh! and Magic collection in one place — every set, every copy, every condition.",
    visual: (
      <View style={styles.fan}>
        {[
          { rotate: "-8deg", accent: "#FFC61E", lift: 24 },
          { rotate: "0deg", accent: "#5B6CFF", lift: 0 },
          { rotate: "8deg", accent: "#F2751A", lift: 24 },
        ].map((card, index) => (
          <View
            key={index}
            style={[
              styles.fanCard,
              {
                marginTop: card.lift,
                transform: [{ rotate: card.rotate }],
                backgroundColor: `${card.accent}1A`,
                borderColor: `${card.accent}35`,
              },
            ]}
          />
        ))}
      </View>
    ),
  },
  {
    title: "Find any card in seconds.",
    body: "Search 130,000+ Pokémon and Magic cards by name, set or collector number — with the real artwork, straight from the source.",
    visual: (
      <View style={styles.frame}>
        <Ionicons name="camera-outline" size={28} color="rgba(255,255,255,0.32)" />
        <Text style={styles.frameCaption}>Camera scanning is on the way</Text>
      </View>
    ),
  },
  {
    title: "Start collecting.",
    body: "Browse a set, look up a card you already own, and see what CardScan knows about it.",
    visual: (
      <View style={styles.sparkle}>
        <Ionicons name="sparkles" size={48} color={C.primary} />
      </View>
    ),
  },
];

export function WelcomeScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [index, setIndex] = useState(0);
  const slides = useMemo(() => buildSlides(styles, C), [styles, C]);
  const slide = slides[index]!;
  const isLast = index === slides.length - 1;

  const finish = async (destination: string) => {
    await markOnboardingSeen();
    router.replace(destination as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.logoBadge}>
            <Ionicons name="scan-outline" size={16} color={C.primary} />
          </View>
          <Text style={styles.brandText}>CardScan</Text>
        </View>
        <Pressable onPress={() => finish("/(tabs)")} hitSlop={10} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.visual}>{slide.visual}</View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel="Progress">
          {slides.map((_, dot) => (
            <Pressable
              key={dot}
              onPress={() => setIndex(dot)}
              accessibilityLabel={`Go to screen ${dot + 1} of ${slides.length}`}
              hitSlop={8}
              style={[styles.dot, dot === index && styles.dotActive]}
            />
          ))}
        </View>

        {isLast ? (
          <View style={styles.actions}>
            <Button label="Find your first card" icon="scan-outline" variant="primary" onPress={() => finish("/(tabs)/scan")} />
            <Button label="Explore the app" icon="layers-outline" variant="ghost" onPress={() => finish("/(tabs)")} />
          </View>
        ) : (
          <Button label="Continue" variant="primary" onPress={() => setIndex(index + 1)} />
        )}
      </View>
    </SafeAreaView>
  );
}
