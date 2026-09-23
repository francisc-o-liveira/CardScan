import { Router } from "express";
import * as collectionController from "../controllers/collectionController";
import { requireAuth } from "../middleware/auth";

export const collectionRoutes = Router();

collectionRoutes.use(requireAuth);
collectionRoutes.get("/", collectionController.listCollection);
collectionRoutes.get("/summary", collectionController.getSummary);
collectionRoutes.get("/owned", collectionController.getOwned);
collectionRoutes.get("/cards/:cardId", collectionController.getCardEntry);
collectionRoutes.post("/items", collectionController.addItem);
collectionRoutes.patch("/items/:id", collectionController.updateItem);
collectionRoutes.delete("/items/:id", collectionController.removeItem);
