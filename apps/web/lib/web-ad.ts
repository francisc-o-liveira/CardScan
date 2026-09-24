/**
 * Plays one rewarded video ad with Google's IMA SDK, from the ad tag (a VAST URL from Ad Manager or any
 * compatible network). Nothing here decides who gets scans: the server times the session and pays it.
 *
 * Ads are requested as non-personalised (`npa=1`) because the web app has no consent banner yet.
 */
const IMA_SRC = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: { ima?: any };
  }
}

let loading: Promise<void> | null = null;

/** Loads the IMA SDK once. Rejects when it is blocked (an ad blocker, or no connection). */
export const loadIma = (): Promise<void> => {
  loading ??= new Promise<void>((resolve, reject) => {
    if (window.google?.ima) return resolve();
    const script = document.createElement("script");
    script.src = IMA_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("The ad player could not be loaded"));
    };
    document.head.appendChild(script);
  });
  return loading;
};

/** The ad tag from the environment, marked non-personalised; null when web ads are not configured. */
export const webAdTagUrl = (): string | null => {
  const tag = process.env.NEXT_PUBLIC_WEB_AD_TAG_URL;
  if (!tag) return null;
  return tag + (tag.includes("?") ? "&" : "?") + "npa=1";
};

export type AdOutcome = "completed" | "skipped" | "failed";

export const playRewardedAd = async (
  container: HTMLElement,
  video: HTMLVideoElement,
  tagUrl: string,
): Promise<AdOutcome> => {
  await loadIma();
  const ima = window.google!.ima;
  const width = container.clientWidth || 640;
  const height = container.clientHeight || 360;

  const displayContainer = new ima.AdDisplayContainer(container, video);
  displayContainer.initialize();
  const loader = new ima.AdsLoader(displayContainer);

  return new Promise<AdOutcome>((resolve) => {
    let manager: any;
    let done = false;
    const finish = (outcome: AdOutcome) => {
      if (done) return;
      done = true;
      try {
        manager?.destroy();
        loader.destroy();
      } catch {
        // Already torn down.
      }
      resolve(outcome);
    };

    loader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (event: any) => {
      manager = event.getAdsManager(video);
      manager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => finish("failed"));
      manager.addEventListener(ima.AdEvent.Type.COMPLETE, () => finish("completed"));
      manager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => finish("completed"));
      manager.addEventListener(ima.AdEvent.Type.SKIPPED, () => finish("skipped"));
      try {
        manager.init(width, height, ima.ViewMode.NORMAL);
        manager.start();
      } catch {
        finish("failed");
      }
    });
    loader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => finish("failed"));

    const request = new ima.AdsRequest();
    request.adTagUrl = tagUrl;
    request.linearAdSlotWidth = width;
    request.linearAdSlotHeight = height;
    loader.requestAds(request);
  });
};
