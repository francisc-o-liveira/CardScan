import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@cardscan/config";

interface ScreenContainerProps {
  title: string;
  children: ReactNode;
}

export function ScreenContainer({ title, children }: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.dark.base100 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.dark.baseContent },
  content: { flex: 1, paddingHorizontal: 20 },
});
