"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";

type CameraState = "starting" | "live" | "unavailable";

const CORNERS = [
  "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-xl",
  "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-xl",
  "left-0 bottom-0 border-b-[3px] border-l-[3px] rounded-bl-xl",
  "right-0 bottom-0 border-b-[3px] border-r-[3px] rounded-br-xl",
] as const;

/**
 * The live camera with the card-shaped frame, opening straight away as docs/design-system.md asks.
 *
 * Browsers only allow the camera on https or localhost, and not every computer has one, so a photo can
 * always be taken or uploaded instead: on a phone, the file picker offers the camera directly.
 */
export function Viewfinder({ busy, onCapture }: { busy: boolean; onCapture: (photo: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CameraState>("starting");

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        if (video.current) video.current.srcObject = media;
        setState("live");
      })
      .catch(() => !cancelled && setState("unavailable"));

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capture = useCallback(() => {
    const frame = video.current;
    if (!frame || !frame.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = frame.videoWidth;
    canvas.height = frame.videoHeight;
    canvas.getContext("2d")?.drawImage(frame, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(blob), "image/jpeg", 0.85);
  }, [onCapture]);

  return (
    <div>
      <div className="relative isolate h-[27.5rem] overflow-hidden rounded-hero border border-hairline bg-[#08080B]">
        {state !== "unavailable" && (
          <video ref={video} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        )}

        {state === "unavailable" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Camera className="h-8 w-8 text-white/50" aria-hidden />
            <p className="text-section font-semibold text-white">Scan cards with a photo</p>
            <p className="max-w-xs text-body text-white/65">
              The live camera isn&apos;t available here. Take or upload a photo of the card instead.
            </p>
          </div>
        ) : (
          // The outline covers 80% of the height: the API falls back to the same area if it can't find the card.
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="relative aspect-[63/88] h-[80%]">
              {CORNERS.map((position) => (
                <span key={position} className={`absolute h-9 w-9 border-primary ${position}`} />
              ))}
            </div>
          </div>
        )}

        {(busy || state === "starting") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 text-white">
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
            {busy && <span className="text-body font-medium">Identifying…</span>}
          </div>
        )}
      </div>

      {state === "live" && (
        <p className="mt-3 text-center text-meta text-muted">Position your card inside the frame</p>
      )}

      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        {state === "live" && (
          <Button variant="primary" size="lg" block isLoading={busy} onClick={capture}>
            <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            {busy ? "Identifying…" : "Scan card"}
          </Button>
        )}
        <Button
          variant={state === "live" ? "outline" : "primary"}
          size="lg"
          block
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <ImageUp className="h-[1.1rem] w-[1.1rem]" aria-hidden />
          {state === "live" ? "Upload a photo" : "Take or upload a photo"}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onCapture(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
