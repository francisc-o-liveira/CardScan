import type { Request, Response } from "express";
import type { ApiResponse, AuthSession, AuthUser } from "@cardscan/types";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@cardscan/validation";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/AppError";
import { parseDurationMs } from "../utils/duration";
import { env } from "../config/env";
import * as authService from "../services/authService";

const REFRESH_COOKIE = "cardscan_refresh_token";

const isMobileClient = (req: Request) => req.headers["x-client-type"] === "mobile";

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
    path: "/api/auth",
  });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
};

/** Sends the session response, giving the refresh token to mobile in the body and to web only via cookie. */
const sendSession = (
  req: Request,
  res: Response,
  statusCode: number,
  session: { user: AuthUser; tokens: { accessToken: string; refreshToken: string } },
) => {
  const mobile = isMobileClient(req);

  if (mobile) {
    const response: ApiResponse<AuthSession> = {
      success: true,
      data: {
        user: session.user,
        tokens: { accessToken: session.tokens.accessToken, refreshToken: session.tokens.refreshToken },
      },
    };
    return res.status(statusCode).json(response);
  }

  setRefreshCookie(res, session.tokens.refreshToken);
  const response: ApiResponse<AuthSession> = {
    success: true,
    data: { user: session.user, tokens: { accessToken: session.tokens.accessToken } },
  };
  res.status(statusCode).json(response);
};

const readRefreshToken = (req: Request): string | undefined =>
  isMobileClient(req) ? (req.body?.refreshToken as string | undefined) : req.cookies?.[REFRESH_COOKIE];

export const register = asyncHandler(async (req, res) => {
  const session = await authService.register(req.body as RegisterInput);
  sendSession(req, res, 201, session);
});

export const login = asyncHandler(async (req, res) => {
  const session = await authService.login(req.body as LoginInput);
  sendSession(req, res, 200, session);
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = readRefreshToken(req);
  if (!refreshToken) {
    throw Errors.unauthorized("No refresh token provided");
  }

  const session = await authService.refresh(refreshToken);
  sendSession(req, res, 200, session);
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = readRefreshToken(req);
  await authService.logout(refreshToken);
  clearRefreshCookie(res);
  const response: ApiResponse<{ loggedOut: true }> = { success: true, data: { loggedOut: true } };
  res.status(200).json(response);
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw Errors.unauthorized();
  }
  const user = await authService.getMe(req.user.sub);
  const response: ApiResponse<AuthUser> = { success: true, data: user };
  res.status(200).json(response);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body as ForgotPasswordInput;
  await authService.forgotPassword(email);
  const response: ApiResponse<{ sent: true }> = { success: true, data: { sent: true } };
  res.status(200).json(response);
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body as ResetPasswordInput);
  const response: ApiResponse<{ reset: true }> = { success: true, data: { reset: true } };
  res.status(200).json(response);
});
