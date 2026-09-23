import { Redirect } from "expo-router";
import { WelcomeScreen } from "@/screens/Welcome/WelcomeScreen";
import { useAuth } from "@/providers/AuthProvider";

export default function WelcomeRoute() {
  const { user, isLoading } = useAuth();
  if (!isLoading && !user) return <Redirect href="/(auth)/login" />;
  return <WelcomeScreen />;
}
