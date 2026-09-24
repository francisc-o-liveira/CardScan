import { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Redirect, Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon } from "@/components/AppIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";

const TAB_BAR_CONTENT_HEIGHT = Platform.OS === "ios" ? 56 : 70;

/**
 * Five destinations, identical to the web bottom bar: Home, Collection, Scan,
 * Discover, Profile. Scan is centre and raised because it's the one action the
 * product is built around.
 *
 * Wishlist used to hold the fourth slot; it's now reached from Profile — a
 * feature existing isn't a reason to spend a nav slot on it.
 */
export default function TabsLayout() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // Same rule as the web nav: a card page belongs to Discover, so Discover stays highlighted there.
  const discoverActive = pathname.startsWith("/discover") || pathname.startsWith("/cards");

  if (!isLoading && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      // Back returns to whatever was open before, so card -> set -> back lands on the card.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.base100 },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.baseContentFaint,
        tabBarLabelStyle: styles.tabLabel,
        // The bar draws edge-to-edge, so the system navigation bar / home indicator height has to be
        // added on top of the content height or it covers the tabs.
        tabBarStyle: [styles.tabBar, { height: TAB_BAR_CONTENT_HEIGHT + insets.bottom, paddingBottom: insets.bottom }],
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "Collection",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "layers" : "layers-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarLabelStyle: [styles.tabLabel, styles.scanLabel],
          tabBarIcon: ({ focused }) => (
            <View style={styles.scanSlot}>
              <View style={[styles.scanButton, focused && styles.scanButtonActive]}>
                <AppIcon name="scan-line" size={26} color={C.primaryContent} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarLabel: ({ color, focused }) => (
            <Text style={[styles.tabLabel, { color: focused || discoverActive ? C.primary : color }]}>Discover</Text>
          ),
          tabBarIcon: ({ color, focused }) => {
            const active = focused || discoverActive;
            return (
              <Ionicons
                name={active ? "compass" : "compass-outline"}
                size={22}
                color={active ? C.primary : color}
              />
            );
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
      {/* Reached from Profile, not the tab bar. */}
      <Tabs.Screen name="wishlist" options={{ href: null, title: "Wishlist" }} />
      <Tabs.Screen name="premium" options={{ href: null, title: "Premium" }} />
      <Tabs.Screen name="decks" options={{ href: null, title: "Decks" }} />
      <Tabs.Screen name="scan-history" options={{ href: null, title: "Scan history" }} />
      <Tabs.Screen name="settings" options={{ href: null, title: "Settings" }} />
      <Tabs.Screen name="help" options={{ href: null, title: "Help" }} />
      {/* Detail pages keep the bar visible, like the web app. Reached from cards and sets, not the bar. */}
      <Tabs.Screen name="cards/index" options={{ href: null, title: "Card database" }} />
      {/* One route per card, so opening a card from another card stacks and back returns to the first. */}
      <Tabs.Screen
        name="cards/[id]"
        dangerouslySingular={(_name, params) => (typeof params.id === "string" ? params.id : undefined)}
        options={{ href: null, title: "Card" }}
      />
      <Tabs.Screen
        name="sets/[id]"
        dangerouslySingular={(_name, params) => (typeof params.id === "string" ? params.id : undefined)}
        options={{ href: null, title: "Set" }}
      />
    </Tabs>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  tabBar: {
    backgroundColor: C.base100,
    borderTopColor: C.border,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabItem: { paddingVertical: 2 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
  scanLabel: { color: C.primary, fontWeight: "700" },
  // Same footprint as the other tabs' 22px icons so the label sits on the same baseline; the button
  // itself is drawn larger and lifted above the bar, ringed in the bar colour so it reads as a cut-out.
  scanSlot: { width: 56, height: 22, alignItems: "center" },
  scanButton: {
    position: "absolute",
    top: -28,
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: C.primary,
    borderWidth: 4,
    borderColor: C.base100,
    alignItems: "center",
    justifyContent: "center",
    // boxShadow replaces the shadow* props, which React Native Web now warns about.
    boxShadow: `0 4px 10px ${C.primary}73`,
    elevation: 8,
  },
  scanButtonActive: { backgroundColor: C.primaryHover },
});
