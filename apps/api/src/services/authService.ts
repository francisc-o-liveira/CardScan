import type { AuthUser } from "@cardscan/types";
import type { RegisterInput, LoginInput, ResetPasswordInput } from "@cardscan/validation";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/AppError";
import { hashPassword, verifyPassword } from "../utils/password";
import { signAccessToken } from "../utils/jwt";
import { generateOpaqueToken, hashOpaqueToken } from "../utils/opaqueToken";
import { parseDurationMs } from "../utils/duration";
import { env } from "../config/env";
import type { User } from "../../generated/prisma";

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  username: user.username,
  avatarUrl: user.avatarUrl,
  role: user.role,
  emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

const issueTokens = async (user: User): Promise<IssuedTokens> => {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const { token: refreshToken, tokenHash } = generateOpaqueToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });

  return { accessToken, refreshToken };
};

export const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
  });
  if (existing) {
    throw Errors.conflict(
      existing.email === input.email
        ? "An account with this email already exists"
        : "This username is already taken",
    );
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: input.email, username: input.username, passwordHash },
    });
    await tx.collection.create({ data: { userId: created.id } });
    await tx.wishlist.create({ data: { userId: created.id } });
    return created;
  });

  const tokens = await issueTokens(user);
  return { user: toAuthUser(user), tokens };
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw Errors.unauthorized("Invalid email or password");
  }

  const tokens = await issueTokens(user);
  return { user: toAuthUser(user), tokens };
};

export const refresh = async (refreshToken: string) => {
  const tokenHash = hashOpaqueToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw Errors.unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    throw Errors.unauthorized();
  }

  // Rotate: revoke the used token and issue a new one.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(user);
  return { user: toAuthUser(user), tokens };
};

export const logout = async (refreshToken: string | undefined) => {
  if (!refreshToken) return;
  const tokenHash = hashOpaqueToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const getMe = async (userId: string): Promise<AuthUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Errors.notFound("User not found");
  }
  return toAuthUser(user);
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave the same way whether or not the account exists, to avoid leaking which emails are registered.
  if (!user) return;

  const { token, tokenHash } = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + parseDurationMs("1h")),
    },
  });

  // No mailer wired up yet (later phase) — log the reset link so the flow is testable end-to-end locally.
  console.info(`[dev] Password reset requested for ${email}. Reset token: ${token}`);
};

export const resetPassword = async (input: ResetPasswordInput) => {
  const tokenHash = hashOpaqueToken(input.token);
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw Errors.unauthorized("Invalid or expired reset token");
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};
