import type { ApiErrorCode } from "@cardscan/types";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  validation: (message: string, details?: unknown) =>
    new AppError(400, "VALIDATION_ERROR", message, details),
  unauthorized: (message = "Authentication required") =>
    new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "You do not have permission to perform this action") =>
    new AppError(403, "FORBIDDEN", message),
  notFound: (message = "Resource not found") => new AppError(404, "NOT_FOUND", message),
  conflict: (message: string) => new AppError(409, "CONFLICT", message),
  rateLimited: (message = "Too many requests, please try again later") =>
    new AppError(429, "RATE_LIMITED", message),
  internal: (message = "Something went wrong") => new AppError(500, "INTERNAL_ERROR", message),
  serviceUnavailable: (message: string) => new AppError(503, "SERVICE_UNAVAILABLE", message),
};
