import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/AppError";
import { grantCredits, startOfUtcDay } from "./quotaService";

/**
 * Rewarded ads on the web. Unlike the Android ads, the browser gives the server no proof that an ad was
 * watched, so this only makes farming hard, not impossible: a session has to be open for a minimum time
 * before it pays, pays once, and a user gets a limited number a day. A script that waits out the timer can
 * still cheat, which is why the reward is small and capped.
 */
const SESSION_MAX_AGE_MS = 10 * 60 * 1000;

const rewardsToday = (userId: string, now: Date) =>
  prisma.scanCredit.count({ where: { userId, source: "web_ad", createdAt: { gte: startOfUtcDay(now) } } });

export const webAdsRemainingToday = async (userId: string, now = new Date()): Promise<number> =>
  Math.max(0, env.WEB_ADS_PER_DAY - (await rewardsToday(userId, now)));

/** Opens a session when the user starts watching. The reward comes from `completeWebAd`. */
export const startWebAd = async (userId: string, now = new Date()) => {
  if ((await webAdsRemainingToday(userId, now)) === 0) {
    throw Errors.rateLimited("You have watched all the ads for today. Come back tomorrow, or get Premium.");
  }
  const session = await prisma.webAdSession.create({ data: { userId, startedAt: now } });
  return { sessionId: session.id, minWatchSeconds: env.WEB_AD_MIN_SECONDS };
};

/** Pays the session's scans if the ad ran long enough. Returns how many scans were added. */
export const completeWebAd = async (userId: string, sessionId: string, now = new Date()): Promise<number> => {
  const session = await prisma.webAdSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw Errors.notFound("Ad session not found");
  if (session.completedAt) throw Errors.conflict("This ad was already counted");
  const age = now.getTime() - session.startedAt.getTime();
  if (age > SESSION_MAX_AGE_MS) throw Errors.validation("This ad session has expired");
  if (age < env.WEB_AD_MIN_SECONDS * 1000) throw Errors.validation("The ad was not watched long enough");
  if ((await webAdsRemainingToday(userId, now)) === 0) throw Errors.rateLimited("You have watched all the ads for today");

  // Closing the session first: a second request for the same session finds it completed.
  const closed = await prisma.webAdSession.updateMany({
    where: { id: session.id, completedAt: null },
    data: { completedAt: now },
  });
  if (closed.count === 0) throw Errors.conflict("This ad was already counted");

  await grantCredits(userId, env.REWARDED_AD_CREDITS, "web_ad", `webad:${session.id}`);
  return env.REWARDED_AD_CREDITS;
};
