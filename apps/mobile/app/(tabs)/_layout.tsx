import { View, StyleSheet, Platform } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/theme";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Five destinations, identical to the web bottom bar: Home, Collection, Scan,
 * Discover, Profile. Scan is centre and raised because it's the one action the
 * product is built around.
 *
 * Wishlist used to hold the fourth slot; it's now reached from Profile — a
 * feature existing isn't a reason to spend a nav slot on it.
 */
export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.baseContentFaint,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
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
            <View style={[styles.scanButton, focused && styles.scanButtonActive]}>
              <Ionicons name="scan-outline" size={22} color={C.primaryContent} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={22} color={color} />
          ),
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: C.base100,
    borderTopColor: C.border,
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 86 : 66,
    paddingTop: 6,
  },
  tabItem: { paddingVertical: 2 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
  scanLabel: { color: C.primary },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonActive: {
    borderWidth: 2,
    borderColor: "rgba(91,108,255,0.4)",
  },
});
