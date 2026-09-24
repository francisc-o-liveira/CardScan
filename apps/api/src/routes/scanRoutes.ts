import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as scanController from "../controllers/scanController";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { uploadPhoto } from "../middleware/upload";

export const scanRoutes = Router();

/** Recognition is the most expensive request the API serves; generous for a person, not for a script. */
const scanRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.SCAN_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many scans, wait a moment and try again" } },
});

scanRoutes.use(requireAuth);
scanRoutes.get("/", scanController.listScans);
scanRoutes.post("/", scanRateLimiter, uploadPhoto, scanController.createScan);
scanRoutes.get("/:id", scanController.getScan);
scanRoutes.post("/:id/confirm", scanController.confirmScan);
