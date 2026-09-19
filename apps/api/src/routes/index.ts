import { Router } from "express";
import { authRoutes } from "./authRoutes";
import { tcgRoutes } from "./tcgRoutes";
import { setRoutes } from "./setRoutes";
import { cardRoutes } from "./cardRoutes";

export const apiRoutes = Router();

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/tcgs", tcgRoutes);
apiRoutes.use("/sets", setRoutes);
apiRoutes.use("/cards", cardRoutes);
