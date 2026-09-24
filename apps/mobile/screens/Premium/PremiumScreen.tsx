import { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { R, T, type Palette, GUTTER } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { QUOTA_KEY, useQuota } from "@/hooks/useQuota";
import {
  loadPackages,
  purchasePackage,
  purchasesAvailable,
  restorePurchases,
  type PurchasePackage,
} from "@/services/purchases";
import { apiErrorMessage } from "@/utils/apiError";
import { formatLongDate } from "@/utils/format";

/** One-off scan packs, shown as information when Google Play's own are not reachable. */
const FALLBACK_PACKS = [
  { id: "scans_25", scans: 25, price: "€0.99" },
  { id: "scans_100", scans: 100, price: "€2.99", note: "Best value" },
];

const BENEFITS = ["Unlimited scans, no ads in between", "Supports the development of CardScan"];

/** The plans shown when Google Play's own are not reachable (Expo Go, the web build); same prices as the web. */
const FALLBACK = [
  { id: "monthly", name: "Monthly", price: "€4.99", per: "a month" },
  { id: "yearly", name: "Yearly", price: "€39.99", per: "a year", note: "Save 33 %" },
];

/**
 * Premium. Searching, card data, prices and the collection stay free for everyone; this only lifts the daily
 * scan limit and removes ads. Billed by Google Play through RevenueCat. The app never unlocks anything on its
 * own: after a purchase it waits for the server, which RevenueCat tells.
 */
export function PremiumScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const queryClient = useQueryClient();
  const { data: quota } = useQuota();
  const available = purchasesAvailable();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const packages = useQuery({ queryKey: ["premium-packages"], queryFn: loadPackages, enabled: available, staleTime: 5 * 60_000 });

  const all = packages.data ?? [];
  const isPack = (pack: PurchasePackage) => pack.product.productCategory === "NON_SUBSCRIPTION";
  const plans = all.filter((pack) => !isPack(pack));
  const scanPacks = all.filter(isPack);

  /** RevenueCat tells the server; wait for it to show up here. */
  const waitForServer = async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await queryClient.invalidateQueries({ queryKey: QUOTA_KEY });
      if (queryClient.getQueryData<{ premium: boolean }>(QUOTA_KEY)?.premium) return true;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return false;
  };

  const buy = async (pack: PurchasePackage) => {
    setMessage(null);
    setBusy(pack.identifier);
    try {
      if (await purchasePackage(pack)) {
        setMessage((await waitForServer()) ? "You are premium. Thank you!" : "Thanks! It can take a minute to show up here.");
      }
    } catch (error) {
      setMessage(apiErrorMessage(error, "The purchase did not go through. You have not been charged."));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy("restore");
    try {
      await restorePurchases();
      setMessage((await waitForServer()) ? "Your subscription is back." : "No subscription found for this account.");
    } catch (error) {
      setMessage(apiErrorMessage(error, "We couldn't restore your purchases."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScreenContainer
      title="CardScan Premium"
      description="Scan as much as you like. Search, card data, prices and your collection are free for everyone."
    >
      <View style={styles.body}>
        {quota?.premium ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>You are premium</Text>
            <Text style={styles.muted}>
              {quota.premiumUntil ? `Your access runs until ${formatLongDate(quota.premiumUntil)}.` : "Your access is active."}
            </Text>
          </View>
        ) : (
          <>
            {BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefit}>
                <Ionicons name="checkmark" size={18} color={C.success} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}

            {available && plans.length > 0
              ? plans.map((pack) => (
                  <View key={pack.identifier} style={styles.panel}>
                    <Text style={styles.panelTitle}>{pack.product.title.replace(/\s*\(.*\)$/, "")}</Text>
                    <Text style={styles.price}>{pack.product.priceString}</Text>
                    <Button
                      label="Subscribe"
                      variant={pack.packageType === "ANNUAL" ? "primary" : "secondary"}
                      onPress={() => buy(pack)}
                      isLoading={busy === pack.identifier}
                      disabled={busy !== null}
                    />
                  </View>
                ))
              : FALLBACK.map((plan) => (
                  <View key={plan.id} style={styles.panel}>
                    <View style={styles.row}>
                      <Text style={styles.panelTitle}>{plan.name}</Text>
                      {plan.note ? <Text style={styles.note}>{plan.note}</Text> : null}
                    </View>
                    <Text style={styles.price}>
                      {plan.price} <Text style={styles.per}>{plan.per}</Text>
                    </Text>
                  </View>
                ))}

            <Text style={styles.sectionTitle}>Or buy scans</Text>
            <Text style={styles.muted}>One-off packs, no subscription. They never expire.</Text>
            {available && scanPacks.length > 0
              ? scanPacks.map((pack) => (
                  <View key={pack.identifier} style={styles.panel}>
                    <Text style={styles.panelTitle}>{pack.product.title.replace(/\s*\(.*\)$/, "")}</Text>
                    <Text style={styles.price}>{pack.product.priceString}</Text>
                    <Button
                      label="Buy"
                      variant="secondary"
                      onPress={() => buy(pack)}
                      isLoading={busy === pack.identifier}
                      disabled={busy !== null}
                    />
                  </View>
                ))
              : FALLBACK_PACKS.map((pack) => (
                  <View key={pack.id} style={styles.panel}>
                    <View style={styles.row}>
                      <Text style={styles.panelTitle}>{pack.scans} scans</Text>
                      {pack.note ? <Text style={styles.note}>{pack.note}</Text> : null}
                    </View>
                    <Text style={styles.price}>{pack.price}</Text>
                  </View>
                ))}

            {!available ? (
              <Text style={styles.muted}>
                Subscriptions are available in the installed Android app, billed by Google Play. This preview cannot buy them.
              </Text>
            ) : (
              <Button label="Restore purchases" variant="ghost" onPress={restore} isLoading={busy === "restore"} disabled={busy !== null} />
            )}
            <Text style={styles.fine}>
              Renews automatically until you cancel in Google Play; you keep Premium until the end of the period you paid for.
            </Text>
          </>
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </ScreenContainer>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  body: { paddingHorizontal: GUTTER, gap: 12 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitText: { color: C.baseContent, fontSize: T.body },
  panel: { padding: 20, gap: 10, borderRadius: R.xl, borderWidth: 1, borderColor: C.border, backgroundColor: C.base200 },
  panelTitle: { color: C.baseContent, fontSize: T.body, fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  price: { color: C.baseContent, fontSize: 28, fontWeight: "700" },
  note: { color: C.success, fontSize: T.meta, fontWeight: "600" },
  per: { color: C.baseContentMuted, fontSize: T.meta, fontWeight: "400" },
  sectionTitle: { marginTop: 12, color: C.baseContent, fontSize: T.section, fontWeight: "700" },
  muted: { color: C.baseContentMuted, fontSize: T.meta },
  fine: { color: C.baseContentFaint, fontSize: 12, lineHeight: 17 },
  message: { color: C.baseContent, fontSize: T.body },
});
