import { isAxiosError } from "axios";
import type { ApiErrorCode } from "@cardscan/types";

/**
 * Wording we prefer over the API's own message, because these reach the user
 * verbatim and need to say what to do next — not just what went wrong.
 */
const FRIENDLY: Partial<Record<ApiErrorCode, string>> = {
  RATE_LIMITED: "Too many attempts. Wait a few minutes and try again.",
  UNAUTHORIZED: "That email and password don't match an account.",
  CONFLICT: "An account with those details already exists. Try signing in instead.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

/**
 * Turns a thrown request into a sentence a person can act on.
 *
 * Axios rejects on any non-2xx, so the API's structured `{ error: { code,
 * message } }` body never reaches the `unwrap` helpers — without this, the UI
 * shows "Request failed with status code 429", which tells the user nothing.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    // No response at all: the request never reached the API.
    if (!error.response) {
      return "We couldn't reach CardScan. Check your connection and try again.";
    }

    const body = error.response.data as
      | { error?: { code?: ApiErrorCode; message?: string } }
      | undefined;
    const code = body?.error?.code;

    if (code && FRIENDLY[code]) return FRIENDLY[code]!;
    if (body?.error?.message) return body.error.message;

    if (error.response.status === 429) return FRIENDLY.RATE_LIMITED!;
    if (error.response.status >= 500) return FRIENDLY.INTERNAL_ERROR!;
    return fallback;
  }

  // Thrown by the service-layer `unwrap` on a 2xx `success: false` body.
  if (error instanceof Error && error.message) return error.message;

  return fallback;
}
