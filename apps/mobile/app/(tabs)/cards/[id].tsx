import { Redirect } from "expo-router";
import { CardDetailScreen } from "@/screens/Cards/CardDetailScreen";
import { useAuth } from "@/providers/AuthProvider";

export default function CardDetailRoute() {
  const { user, isLoading } = useAuth();
  if (!isLoading && !user) return <Redirect href="/(auth)/login" />;
  return <CardDetailScreen />;
}
