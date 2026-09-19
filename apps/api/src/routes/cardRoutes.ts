import { Router } from "express";
import * as catalogController from "../controllers/catalogController";

export const cardRoutes = Router();

cardRoutes.get("/", catalogController.listCards);
cardRoutes.get("/:id", catalogController.getCard);
