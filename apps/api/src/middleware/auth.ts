import type { NextFunction, Request, Response } from "express";
import { Errors } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(Errors.unauthorized());
  }

  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(Errors.unauthorized("Invalid or expired access token"));
  }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== "ADMIN") {
    return next(Errors.forbidden());
  }
  next();
};
