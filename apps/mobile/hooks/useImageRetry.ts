import { useCallback, useEffect, useRef, useState } from "react";

/** A card image that fails once is retried before the placeholder replaces it. */
export const IMAGE_MAX_RETRIES = 2;
export const IMAGE_RETRY_DELAY_MS = 1200;

/**
 * Retry state for one remote image. A single dropped request (a slow CDN, a phone switching networks)
 * used to leave "No image" on the tile until the screen was rebuilt. Bump `attempt` into the image's
 * `key` so each retry is a fresh request; `failed` turns true only after the last retry.
 */
export function useImageRetry(uri: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
    return () => clearTimeout(timer.current);
  }, [uri]);

  const onError = useCallback(() => {
    if (attempt >= IMAGE_MAX_RETRIES) {
      setFailed(true);
      return;
    }
    timer.current = setTimeout(() => setAttempt((current) => current + 1), IMAGE_RETRY_DELAY_MS);
  }, [attempt]);

  return { attempt, failed, onError };
}
