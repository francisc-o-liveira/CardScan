import { createApp } from "./app";
import { env } from "./config/env";
import { warmUpRecognition } from "./recognition/provider";
import { startAutoSync } from "./services/autoSyncService";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`CardScan API listening on http://localhost:${env.PORT}`);
  startAutoSync();
  // Off the request path: the API answers straight away while the model and index load.
  warmUpRecognition().catch((error: unknown) =>
    console.warn("[recognition] Could not load:", error instanceof Error ? error.message : error),
  );
});
