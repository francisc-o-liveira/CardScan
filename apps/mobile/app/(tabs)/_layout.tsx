import { View, StyleSheet } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@cardscan/config";
import { useAuth } from "@/providers/AuthProvider";

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.dark.primary,
        tabBarInactiveTintColor: COLORS.dark.baseContentMuted,
        tabBarStyle: {
          backgroundColor: COLORS.dark.base200,
          borderTopColor: COLORS.dark.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "Collection",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={styles.scanButton}>
              <Ionicons name="scan-outline" size={22} color={COLORS.dark.primaryContent} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
});
