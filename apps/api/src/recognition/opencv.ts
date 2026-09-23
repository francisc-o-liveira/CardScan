export type OpenCv = typeof import("@techstark/opencv-js");

let ready: Promise<OpenCv> | undefined;

/**
 * OpenCV compiled to WebAssembly: no native build, so it installs the same on every machine. The module
 * resolves asynchronously once its runtime has initialised; this waits for that exactly once.
 */
export const getOpenCv = (): Promise<OpenCv> => {
  if (!ready) {
    ready = (async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loaded = require("@techstark/opencv-js") as OpenCv | Promise<OpenCv>;
      if (loaded instanceof Promise) return loaded;
      const module = loaded as OpenCv & { onRuntimeInitialized?: () => void };
      if (typeof module.Mat === "function") return module;
      return new Promise<OpenCv>((resolve) => {
        module.onRuntimeInitialized = () => resolve(module);
      });
    })();
  }
  return ready;
};
