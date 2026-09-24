import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Subscriptions through Google Play Billing, managed by RevenueCat. Like the ads, the native module only exists
 * in an installed build, so it is loaded on demand. The app logs into RevenueCat with our user id; RevenueCat
 * tells the server (`POST /api/billing/revenuecat`) when a purchase, renewal or expiry happens, and the server
 * decides who is premium. Nothing here unlocks anything by itself.
 */
type PurchasesModule = typeof import("react-native-purchases");
export type PurchasePackage = import("react-native-purchases").PurchasesPackage;

let cached: PurchasesModule | null | undefined;
let configuredFor: string | null = null;

const load = (): PurchasesModule | null => {
  if (cached !== undefined) return cached;
  const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (Platform.OS !== "android" || inExpoGo || !process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY) return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-purchases") as PurchasesModule;
  } catch {
    cached = null;
  }
  return cached;
};

export const purchasesAvailable = (): boolean => load() !== null;

/** Connects RevenueCat to this user. Safe to call on every sign-in. */
export const configurePurchases = async (userId: string): Promise<void> => {
  const module = load();
  if (!module || configuredFor === userId) return;
  const Purchases = module.default;
  if (configuredFor === null) {
    Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!, appUserID: userId });
  } else {
    await Purchases.logIn(userId);
  }
  configuredFor = userId;
};

export const signOutPurchases = async (): Promise<void> => {
  const module = load();
  if (!module || configuredFor === null) return;
  configuredFor = null;
  await module.default.logOut().catch(() => undefined);
};

/** The plans to offer, with the price in the user's currency as Google Play states it. */
export const loadPackages = async (): Promise<PurchasePackage[]> => {
  const module = load();
  if (!module) return [];
  const offerings = await module.default.getOfferings();
  return offerings.current?.availablePackages ?? [];
};

/** Buys a package. Returns false when the user backed out. */
export const purchasePackage = async (pack: PurchasePackage): Promise<boolean> => {
  const module = load();
  if (!module) return false;
  try {
    await module.default.purchasePackage(pack);
    return true;
  } catch (error) {
    if ((error as { userCancelled?: boolean }).userCancelled) return false;
    throw error;
  }
};

export const restorePurchases = async (): Promise<void> => {
  const module = load();
  if (module) await module.default.restorePurchases();
};
