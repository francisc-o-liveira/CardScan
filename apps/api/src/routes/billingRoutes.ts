import { Router } from "express";
import * as billingController from "../controllers/billingController";
import { requireAuth } from "../middleware/auth";

export const billingRoutes = Router();

billingRoutes.post("/checkout", requireAuth, billingController.createCheckout);
billingRoutes.post("/revenuecat", billingController.revenueCatWebhook);
