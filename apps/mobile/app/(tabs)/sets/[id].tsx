import { Redirect } from "expo-router";
import { SetDetailScreen } from "@/screens/Sets/SetDetailScreen";
import { useAuth } from "@/providers/AuthProvider";

export default function SetDetailRoute() {
  const { user, isLoading } = useAuth();
  if (!isLoading && !user) return <Redirect href="/(auth)/login" />;
  return <SetDetailScreen />;
}
