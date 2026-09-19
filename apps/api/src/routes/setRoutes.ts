import { Router } from "express";
import * as catalogController from "../controllers/catalogController";

export const setRoutes = Router();

setRoutes.get("/", catalogController.listSets);
setRoutes.get("/:id", catalogController.getSet);
