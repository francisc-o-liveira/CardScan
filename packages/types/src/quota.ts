/** Where the user stands with scanning today: `GET /api/quota`, and the details of a `QUOTA_EXCEEDED` error. */
export interface ScanQuota {
  /** Premium users have no limit and see no ads. */
  premium: boolean;
  /** Extra free scans a day, or `null` when there is none (the default) and for premium. */
  dailyLimit: number | null;
  /** Free scans left today; `null` for premium. */
  freeRemaining: number | null;
  /** Scans in hand: the ones everyone starts with and those from rewarded ads, spent after the daily free ones. */
  credits: number;
  /** When the daily free scans come back (start of the next UTC day), ISO 8601; only meaningful with a daily limit. */
  resetsAt: string;
  /** When premium ends, ISO 8601, or `null` if the user is not premium. */
  premiumUntil: string | null;
  /** Extra scans one rewarded ad gives, and how many ads can still be watched today. */
  rewardedAd: { credits: number; remainingToday: number };
  /** The same on the web, where an ad is timed by the server instead of verified by Google. */
  webRewardedAd: { credits: number; remainingToday: number; minWatchSeconds: number };
}
