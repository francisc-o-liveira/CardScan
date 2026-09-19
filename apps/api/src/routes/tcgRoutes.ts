import { Router } from "express";
import * as catalogController from "../controllers/catalogController";

export const tcgRoutes = Router();

tcgRoutes.get("/", catalogController.listTcgs);
