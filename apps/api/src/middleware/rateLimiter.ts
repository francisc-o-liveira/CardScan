import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const createAuthRateLimiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many attempts, please try again later" },
    },
  });

export const authRateLimiter = createAuthRateLimiter(env.AUTH_RATE_LIMIT);
