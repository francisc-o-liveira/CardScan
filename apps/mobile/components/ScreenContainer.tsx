import { useMemo } from "react";
import type { ReactNode } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { S, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { AppHeader } from "@/components/AppHeader";

interface ScreenContainerProps {
  /** Omit on screens that open straight onto content, like Home. */
  title?: string;
  /** One line under the title saying what the screen is for. */
  description?: string;
  /** Wraps children in a ScrollView. Off for screens that own their own list. */
  scroll?: boolean;
  /** Rendered directly under the header, outside the scroll padding. */
  headerAccessory?: ReactNode;
  children: ReactNode;
}

export function ScreenContainer({
  title,
  description,
  scroll = true,
  headerAccessory,
  children,
}: ScreenContainerProps) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const body = (
    <>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      ) : (
        <View style={styles.headerGap} />
      )}
      {headerAccessory}
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <AppHeader />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.base100 },
  flex: { flex: 1 },
  // Bottom padding clears the tab bar.
  scrollContent: { paddingBottom: 96 },
  headerGap: { height: 24 },
  header: { paddingHorizontal: GUTTER, paddingTop: S.xl, paddingBottom: S.lg },
  title: {
    fontSize: T.title,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: C.baseContent,
  },
  description: {
    marginTop: 6,
    fontSize: T.body,
    lineHeight: 21,
    color: C.baseContentMuted,
  },
});
