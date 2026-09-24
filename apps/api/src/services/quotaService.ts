import type { ScanQuota } from "@cardscan/types";
import { Prisma } from "../../generated/prisma";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/AppError";
import { webAdsRemainingToday } from "./webAdService";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC of `now`: the quota day. */
export const startOfUtcDay = (now = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/** What a scan was paid with, so a failed scan can give it back. */
export type ScanReservation = { kind: "premium" } | { kind: "free"; day: Date } | { kind: "credit" };

/** Access lasts until the subscription's end date, also after the user cancelled it. */
export const premiumUntil = (
  subscription: { status: string; expiresAt: Date | null } | null,
  now = new Date(),
): Date | null => {
  if (!subscription || subscription.status === "expired") return null;
  return subscription.expiresAt && subscription.expiresAt > now ? subscription.expiresAt : null;
};

/**
 * The scans everyone starts with, given once. Done on first use rather than at sign-up, so accounts that
 * existed before the limit got theirs too; the ledger row is the "already given" marker.
 */
const ensureWelcomeCredits = async (userId: string): Promise<void> => {
  if (env.WELCOME_SCAN_CREDITS <= 0) return;
  const externalId = `welcome:${userId}`;
  if (await prisma.scanCredit.findUnique({ where: { externalId }, select: { id: true } })) return;
  await grantCredits(userId, env.WELCOME_SCAN_CREDITS, "welcome", externalId);
};

const creditBalance = async (userId: string, db: Prisma.TransactionClient | typeof prisma = prisma) => {
  const { _sum } = await db.scanCredit.aggregate({ where: { userId }, _sum: { amount: true } });
  return Math.max(0, _sum.amount ?? 0);
};

export const getQuota = async (userId: string, now = new Date()): Promise<ScanQuota> => {
  await ensureWelcomeCredits(userId);
  const day = startOfUtcDay(now);
  const [subscription, usage, credits, adsToday, webAdsLeft] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.scanUsage.findUnique({ where: { userId_day: { userId, day } } }),
    creditBalance(userId),
    prisma.scanCredit.count({ where: { userId, source: "rewarded_ad", createdAt: { gte: day } } }),
    webAdsRemainingToday(userId, now),
  ]);
  const until = premiumUntil(subscription, now);
  const premium = until !== null;

  return {
    premium,
    dailyLimit: premium || env.FREE_SCANS_PER_DAY === 0 ? null : env.FREE_SCANS_PER_DAY,
    freeRemaining: premium ? null : Math.max(0, env.FREE_SCANS_PER_DAY - (usage?.used ?? 0)),
    credits,
    resetsAt: new Date(day.getTime() + DAY_MS).toISOString(),
    premiumUntil: until?.toISOString() ?? null,
    rewardedAd: { credits: env.REWARDED_AD_CREDITS, remainingToday: Math.max(0, env.REWARDED_ADS_PER_DAY - adsToday) },
    webRewardedAd: { credits: env.REWARDED_AD_CREDITS, remainingToday: webAdsLeft, minWatchSeconds: env.WEB_AD_MIN_SECONDS },
  };
};

/**
 * Pays for one scan: premium is free, otherwise a free scan of today, otherwise a credit. Throws
 * `QUOTA_EXCEEDED` (402) when there is nothing left. The user's row is locked while deciding, so two scans
 * sent at the same moment cannot both spend the last one.
 */
export const reserveScan = async (userId: string, now = new Date()): Promise<ScanReservation> => {
  await ensureWelcomeCredits(userId);
  const day = startOfUtcDay(now);

  const reservation = await prisma.$transaction(async (tx): Promise<ScanReservation | null> => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

    const subscription = await tx.subscription.findUnique({ where: { userId } });
    if (premiumUntil(subscription, now)) return { kind: "premium" };

    const usage = await tx.scanUsage.findUnique({ where: { userId_day: { userId, day } } });
    if ((usage?.used ?? 0) < env.FREE_SCANS_PER_DAY) {
      await tx.scanUsage.upsert({
        where: { userId_day: { userId, day } },
        create: { userId, day, used: 1 },
        update: { used: { increment: 1 } },
      });
      return { kind: "free", day };
    }

    if ((await creditBalance(userId, tx)) > 0) {
      await tx.scanCredit.create({ data: { userId, amount: -1, source: "scan" } });
      return { kind: "credit" };
    }
    return null;
  });

  if (!reservation) {
    throw Errors.quotaExceeded(
      "You are out of scans. Watch an ad for more, or go premium.",
      await getQuota(userId, now),
    );
  }
  return reservation;
};

/** Gives back what a scan cost when it failed for a reason that is not the user's doing. */
export const refundScan = async (userId: string, reservation: ScanReservation): Promise<void> => {
  if (reservation.kind === "free") {
    await prisma.scanUsage.updateMany({
      where: { userId, day: reservation.day, used: { gt: 0 } },
      data: { used: { decrement: 1 } },
    });
  } else if (reservation.kind === "credit") {
    await prisma.scanCredit.create({ data: { userId, amount: 1, source: "refund" } });
  }
};

/**
 * Adds extra scans. With an `externalId` (an ad transaction id) a repeated call does nothing, so a callback
 * that arrives twice cannot pay twice. Returns whether credits were added.
 */
export const grantCredits = async (
  userId: string,
  amount: number,
  source: string,
  externalId?: string,
): Promise<boolean> => {
  try {
    await prisma.scanCredit.create({ data: { userId, amount, source, externalId } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
};

/**
 * Takes back the scans of a purchase that was refunded, once. If the user already spent them the balance goes
 * below zero, which `creditBalance` shows as none and which later grants pay off first. Returns whether
 * anything was taken back.
 */
export const revokeGrant = async (grantExternalId: string): Promise<boolean> => {
  const grant = await prisma.scanCredit.findUnique({ where: { externalId: grantExternalId } });
  if (!grant || grant.amount <= 0) return false;
  return grantCredits(grant.userId, -grant.amount, "refund", `refund:${grantExternalId}`);
};

export interface SubscriptionUpdate {
  status: "active" | "canceled" | "expired";
  plan?: string | null;
  source: "revenuecat" | "stripe";
  externalId?: string | null;
  expiresAt?: Date | null;
}

export const saveSubscription = async (userId: string, update: SubscriptionUpdate): Promise<void> => {
  const data = {
    status: update.status,
    source: update.source,
    ...(update.plan !== undefined && { plan: update.plan }),
    ...(update.externalId !== undefined && { externalId: update.externalId }),
    ...(update.expiresAt !== undefined && { expiresAt: update.expiresAt }),
  };
  await prisma.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
};
