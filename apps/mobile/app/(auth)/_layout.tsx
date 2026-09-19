import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
