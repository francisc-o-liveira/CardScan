import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Ads (Google AdMob). The native module only exists in an installed build, not in Expo Go and not on the web,
 * so it is loaded on demand and everything here quietly reports "not available" when it is missing. The
 * ad unit ids below are Google's test ads until the real ones are set (EXPO_PUBLIC_ADMOB_*).
 *
 * The rewarded ad carries the user's id, which Google sends back to our server when the ad was really watched
 * (`GET /api/ads/ssv`): only that verified callback adds credits, never the app.
 */
type AdsModule = typeof import("react-native-google-mobile-ads");

let cached: AdsModule | null | undefined;
let initialised: Promise<boolean> | null = null;

const load = (): AdsModule | null => {
  if (cached !== undefined) return cached;
  const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (Platform.OS !== "android" || inExpoGo) return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-google-mobile-ads") as AdsModule;
  } catch {
    cached = null;
  }
  return cached;
};

export const adsAvailable = (): boolean => load() !== null;

/** The consent form (required in the EU) and the SDK start-up, once. Resolves to whether ads may be requested. */
const initialise = (): Promise<boolean> => {
  const ads = load();
  if (!ads) return Promise.resolve(false);
  initialised ??= (async () => {
    try {
      const consent = await ads.AdsConsent.gatherConsent();
      if (!consent.canRequestAds) return false;
      await ads.default().initialize();
      return true;
    } catch {
      return false;
    }
  })();
  return initialised;
};

export const rewardedUnitId = (ads: AdsModule): string =>
  __DEV__ ? ads.TestIds.REWARDED : (process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID ?? ads.TestIds.REWARDED);

export const bannerUnitId = (ads: AdsModule): string =>
  __DEV__ ? ads.TestIds.BANNER : (process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID ?? ads.TestIds.BANNER);

export type RewardedResult = "earned" | "closed" | "unavailable";

/** Shows a rewarded ad for `userId`. "earned" means the user watched it; the credits arrive from the server. */
export const showRewardedAd = async (userId: string): Promise<RewardedResult> => {
  const ads = load();
  if (!ads || !(await initialise())) return "unavailable";

  return new Promise<RewardedResult>((resolve) => {
    const ad = ads.RewardedAd.createForAdRequest(rewardedUnitId(ads), {
      serverSideVerificationOptions: { userId },
    });
    let earned = false;
    const listeners: (() => void)[] = [];
    const finish = (result: RewardedResult) => {
      listeners.forEach((stop) => stop());
      resolve(result);
    };
    listeners.push(
      ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => void ad.show()),
      ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(ads.AdEventType.CLOSED, () => finish(earned ? "earned" : "closed")),
      ad.addAdEventListener(ads.AdEventType.ERROR, () => finish("unavailable")),
    );
    ad.load();
  });
};

/** Starts the consent form and the SDK early, so the first ad does not wait for them. */
export const warmUpAds = (): void => {
  void initialise();
};

export const adsModule = load;
