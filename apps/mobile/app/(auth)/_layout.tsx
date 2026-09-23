import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useHomeRoute } from "@/hooks/useHomeRoute";

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  const homeRoute = useHomeRoute();

  if (!isLoading && user) {
    // Wait for the stored onboarding flag so a first login is not sent to Home and then bounced.
    return homeRoute ? <Redirect href={homeRoute} /> : null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
