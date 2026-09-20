import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

/** Sent to every catalog source — several of them ask API consumers to identify themselves. */
export const USER_AGENT = "CardScan/0.1 (+https://github.com/cardscan; contact: dev@cardscan.app)";

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface HttpClient {
  /** GET a JSON document. Retries transient failures (429/5xx/network) with backoff. */
  getJson<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
  /** GET a binary file (card images). */
  getBuffer(url: string): Promise<Buffer>;
}

export interface HttpClientOptions {
  baseURL?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  /** Test seam: replaces the underlying axios instance. */
  instance?: AxiosInstance;
}

export const createHttpClient = ({
  baseURL,
  timeoutMs = 60_000,
  retries = 3,
  retryDelayMs = 1_000,
  instance,
}: HttpClientOptions = {}): HttpClient => {
  const client =
    instance ??
    axios.create({
      baseURL,
      timeout: timeoutMs,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // Large catalog dumps (the FAB dataset is ~23MB).
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

  const withRetry = async <T>(run: () => Promise<T>): Promise<T> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await run();
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const transient = status === undefined ? axios.isAxiosError(error) : RETRYABLE.has(status);
        if (!transient || attempt >= retries) throw error;
        await sleep(retryDelayMs * 2 ** attempt);
      }
    }
  };

  return {
    getJson: (path, config) =>
      withRetry(async () => (await client.get(path, { ...config, maxRedirects: 5 })).data),
    getBuffer: (url) =>
      withRetry(async () => {
        const { data } = await client.get<ArrayBuffer>(url, {
          responseType: "arraybuffer",
          headers: { Accept: "image/*,*/*" },
          timeout: 30_000,
        });
        return Buffer.from(data);
      }),
  };
};
