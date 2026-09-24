import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { configurePurchases, signOutPurchases } from "@/services/purchases";

/** Keeps RevenueCat logged in as the signed-in user, so its webhooks name the right account. Renders nothing. */
export function PurchasesSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) void configurePurchases(user.id).catch(() => undefined);
    else void signOutPurchases();
  }, [user]);
  return null;
}
