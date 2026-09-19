import { Router } from "express";
import { authRoutes } from "./authRoutes";

export const apiRoutes = Router();

apiRoutes.use("/auth", authRoutes);
