import { Router } from "express";
import * as adsController from "../controllers/adsController";
import { requireAuth } from "../middleware/auth";

export const adsRoutes = Router();

adsRoutes.get("/ssv", adsController.rewardedAdCallback);
adsRoutes.post("/web/start", requireAuth, adsController.startWebAd);
adsRoutes.post("/web/complete", requireAuth, adsController.completeWebAd);
