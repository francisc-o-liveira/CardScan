import { getApiUrl } from "@/lib/api-client";

/**
 * Card images that CardScan re-hosts (Yu-Gi-Oh!) are stored with the API's public URL from the
 * machine that ran the sync, usually `http://localhost:4100`. A phone or emulator can't reach
 * "localhost" on the dev machine, so those URLs are re-pointed at the API host this app talks to.
 * Images on external CDNs (TCGdex, Scryfall) are returned untouched.
 */
export const resolveImageUrl = (url: string | null | undefined, apiUrl: string = getApiUrl()): string | null => {
  if (!url) return null;

  const match = /^https?:\/\/[^/]+(\/assets\/.*)$/.exec(url);
  if (!match) return url;

  const origin = /^(https?:\/\/[^/]+)/.exec(apiUrl)?.[1];
  return origin ? `${origin}${match[1]}` : url;
};
