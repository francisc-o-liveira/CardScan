import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import type { ApiResponse } from "@cardscan/types";
import { env } from "./config/env";
import { apiRoutes } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    const response: ApiResponse<{ status: "ok" }> = { success: true, data: { status: "ok" } };
    res.status(200).json(response);
  });

  app.use("/api", apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
