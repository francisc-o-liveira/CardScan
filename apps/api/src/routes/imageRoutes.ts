import { Router } from "express";
import * as imageController from "../controllers/imageController";

export const imageRoutes = Router();

imageRoutes.get("/", imageController.proxyImage);
