import { Redirect } from "expo-router";
import { CardDatabaseScreen } from "@/screens/Cards/CardDatabaseScreen";
import { useAuth } from "@/providers/AuthProvider";

export default function CardsRoute() {
  const { user, isLoading } = useAuth();
  if (!isLoading && !user) return <Redirect href="/(auth)/login" />;
  return <CardDatabaseScreen />;
}
