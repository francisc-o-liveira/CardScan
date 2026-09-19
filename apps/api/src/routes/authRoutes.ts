import { Router } from "express";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@cardscan/validation";
import * as authController from "../controllers/authController";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { authRateLimiter } from "../middleware/rateLimiter";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  authController.register,
);
authRoutes.post("/login", authRateLimiter, validateBody(loginSchema), authController.login);
authRoutes.post("/logout", authController.logout);
authRoutes.post("/refresh", authRateLimiter, authController.refresh);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.post(
  "/forgot-password",
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
authRoutes.post(
  "/reset-password",
  authRateLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword,
);
