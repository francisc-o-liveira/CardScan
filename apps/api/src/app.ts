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
      // Comma-separated list: the web app, and the Expo web build of the mobile app in development.
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean),
      credentials: true,
    }),
  );
  // Re-hosted card images. Helmet's default same-origin resource policy would stop the web app
  // (a different origin in dev) from displaying them, so this route opts in to cross-origin use.
  app.use(
    "/assets",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(env.ASSETS_DIR, { maxAge: "30d", immutable: true, index: false }),
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
