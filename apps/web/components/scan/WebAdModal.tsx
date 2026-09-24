"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/services/api";
import { getErrorMessage } from "@/lib/api-error";
import { playRewardedAd, webAdTagUrl } from "@/lib/web-ad";

interface WebAdModalProps {
  /** How many scans the ad is worth, shown to the user. */
  credits: number;
  onEarned: () => void;
  onClose: () => void;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The web's rewarded ad: opens a session on the server, plays the ad, and asks for the scans once it ends.
 * The server pays only a session that ran for its minimum time, so if the ad is shorter the request waits.
 */
export function WebAdModal({ credits, onEarned, onClose }: WebAdModalProps) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // React runs effects twice in development; one ad per opening.
    if (started.current) return;
    started.current = true;
    const tag = webAdTagUrl();
    if (!tag || !container.current || !video.current) return;

    (async () => {
      try {
        const startedAt = Date.now();
        const { sessionId, minWatchSeconds } = await api.quota.startWebAd();
        const outcome = await playRewardedAd(container.current!, video.current!, tag);
        if (outcome === "skipped") return setMessage("Watch the whole ad to get the scans.");
        if (outcome === "failed") return setMessage("No ad is available right now. Try again in a moment, or get Premium.");

        await wait(Math.max(0, minWatchSeconds * 1000 - (Date.now() - startedAt)) + 300);
        await api.quota.completeWebAd(sessionId);
        onEarned();
      } catch (error) {
        setMessage(getErrorMessage(error, "The ad could not be loaded. An ad blocker may be stopping it."));
      }
    })();
  }, [onEarned]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Advertisement" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-panel border border-hairline bg-base-100 p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-meta text-muted">Advertisement · you get {credits} scans when it ends</p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:text-base-content">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div ref={container} className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video ref={video} playsInline muted className="h-full w-full" />
        </div>
        {message && (
          <p role="alert" className="mt-3 text-body">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
