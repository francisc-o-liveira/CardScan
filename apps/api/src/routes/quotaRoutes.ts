import { Router } from "express";
import * as quotaController from "../controllers/quotaController";
import { requireAuth } from "../middleware/auth";

export const quotaRoutes = Router();

quotaRoutes.get("/", requireAuth, quotaController.getQuota);
