import { View, Text, StyleSheet } from "react-native";
import { C, S, T } from "@/theme";

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: S.xl, marginBottom: 12 },
  title: { color: C.baseContent, fontSize: T.section, fontWeight: "700", letterSpacing: -0.2 },
  subtitle: { marginTop: 2, color: C.baseContentMuted, fontSize: T.meta },
});
