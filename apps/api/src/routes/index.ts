import { Router } from "express";
import { authRoutes } from "./authRoutes";
import { tcgRoutes } from "./tcgRoutes";
import { setRoutes } from "./setRoutes";
import { cardRoutes } from "./cardRoutes";
import { imageRoutes } from "./imageRoutes";
import { scanRoutes } from "./scanRoutes";
import { collectionRoutes } from "./collectionRoutes";

export const apiRoutes = Router();

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/tcgs", tcgRoutes);
apiRoutes.use("/sets", setRoutes);
apiRoutes.use("/cards", cardRoutes);
apiRoutes.use("/images", imageRoutes);
apiRoutes.use("/scans", scanRoutes);
apiRoutes.use("/collection", collectionRoutes);
