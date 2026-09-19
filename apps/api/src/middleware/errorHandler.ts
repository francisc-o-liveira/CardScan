import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "@cardscan/types";
import { ZodError } from "zod";
import { AppError, Errors } from "../utils/AppError";
import { env } from "../config/env";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(Errors.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.flatten().fieldErrors,
      },
    };
    return res.status(400).json(response);
  }

  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    return res.status(err.statusCode).json(response);
  }

  if (env.NODE_ENV === "development") {
    console.error(err);
  }

  const response: ApiErrorResponse = {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  };
  res.status(500).json(response);
};
