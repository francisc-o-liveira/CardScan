# Card recognition

How a photo becomes a catalog card. Everything runs inside the API (`apps/api/src/recognition/`), in
TypeScript, with no extra service, database extension or cloud account.

## Pipeline

```
photo ──► straighten ──► embed (upright + 180°) ──► nearest cards ──► ranked candidates + confidence
          OpenCV (WASM)   DINOv2-small (ONNX)        brute-force scan
```

1. **Straighten** (`rectify.ts`) — finds the card outline with OpenCV (edges, then a brightness threshold
   as a second attempt), keeps the largest card-shaped quadrilateral, and warps it to a flat 488×680
   image. A sideways card is turned upright. If no outline is found, the centre of the photo (80% of its
   height, card-shaped) is used: that is where the apps' frame asks for the card.
2. **Embed** (`embedder.ts`) — runs DINOv2-small, a general visual model that is strong at "is this the
   same object" retrieval, at 224×308 (the card's proportions, so nothing is cropped). Each vector is the
   CLS token and the mean of the patch tokens, each normalised: 768 numbers. The card is embedded twice,
   upright and rotated 180°, because cards are often held upside down.
3. **Search** (`indexStore.ts`) — compares the vector with every indexed card. Vectors are stored as Int8
   with one scale each (~100MB for 130k cards) and scanned in memory: tens of milliseconds, no vector
   database needed. The best score of the two orientations counts.
4. **Confidence** (`provider.ts`) — how far the best candidate stands out from the runner-up. The apps
   show a single card to confirm at or above `SCAN_CONFIDENT` (`@cardscan/config`), and the candidate list
   below it.

`CardRecognitionProvider` is the seam: the API routes only call `recognize(photo)`, so a different model
or a cloud vision service can replace the local one without touching the routes or the apps.

## Running it

```bash
pnpm --filter @cardscan/api recognition:index all   # build the index (resumable; ~1h for Pokémon + Magic)
pnpm --filter @cardscan/api recognition:eval        # measure accuracy on simulated photos
```

- The model (~90MB) downloads on first use into `apps/api/storage/recognition/models`; the index lives in
  `apps/api/storage/recognition/index`. Both are ignored by git and can be rebuilt.
- The index is split in shards of 512 cards. An interrupted build continues where it stopped, and the API
  picks up new shards without a restart.
- `RECOGNITION_DEVICE=auto` (default) runs the model on the GPU through DirectML on Windows — about 10×
  faster than the CPU, with identical output — and on the CPU elsewhere. `cpu` or `dml` force one.
- Until the index exists, `POST /api/scans` answers `503 SERVICE_UNAVAILABLE` and the apps say so.

## Measuring accuracy

There are no real photos to test with yet, so `scripts/evaluateRecognition.ts` builds simulated phone
photos from catalog images: the card on a surface (wood, plain, gradient), tilted, rotated, in perspective,
sometimes upside down, with uneven light, glare, blur and JPEG compression. It uses a different rendition
of the image than the one indexed, runs the full pipeline, and reports top-1 / top-5 accuracy and how
accuracy tracks the confidence score. Sample photos and their straightened versions are saved to
`storage/recognition/eval` for a visual check.

Latest run (300 photos, index of 128,751 Pokémon and Magic cards, GPU):

| Metric | Result |
| --- | --- |
| Card outline found | 99.7% |
| Exact printing ranked first | 87% |
| Exact printing in the top 5 | 99% |
| Right card name ranked first | 99% |
| Time per photo (straighten + embed) | ~0.2 s |

Every photo whose top two scores were 0.02 or more apart had the right card first (172 of 172); below
0.01 only 62% did, almost all reprints that share artwork. `CONFIDENT_MARGIN` maps a 0.02 gap to the 0.6
`SCAN_CONFIDENT` threshold, so the apps offer a single card only in that proven range and the candidate
list otherwise.

Simulated photos are a stand-in, not a substitute: real ones add reflections from sleeves, fingers,
motion blur and colour casts. Every confirmation in the apps is stored in `RecognitionFeedback`
(predicted card vs. the card the user chose), which is the dataset for measuring real-world accuracy
once people scan.

## Known limits

- **Same artwork, different printing.** Reprints that share artwork look identical to the model, so the
  right card is found but the set may not be. Confidence drops in that case and the user picks from the
  list. Reading the collector number (OCR) is the next step if this shows up often in feedback.
- **Catalog coverage.** Only cards that are imported and indexed can be recognised.
