import axios from "axios";

/** The API's own message for a failed request (it explains 4xx/5xx in plain words), or a fallback. */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (message) return message;
    if (!error.response) return "CardScan can't reach the server. Check the connection and try again.";
  }
  return fallback;
};
