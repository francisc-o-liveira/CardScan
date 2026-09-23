import path from "node:path";
import sharp from "sharp";
import { AutoModel, Tensor, env as hfEnv, type PreTrainedModel } from "@huggingface/transformers";
import { env } from "../config/env";

/** DINOv2-small: a general visual model that is strong at "is this the same object" retrieval. */
export const EMBEDDING_MODEL = "onnx-community/dinov2-small";

/** Card proportions (63x88mm) in multiples of the model's 14px patch, so no part of the card is cropped. */
export const INPUT_WIDTH = 224;
export const INPUT_HEIGHT = 308;

const HIDDEN_SIZE = 384;
/** Each vector is [CLS token | mean of the patch tokens], each half normalised on its own. */
export const EMBEDDING_DIM = HIDDEN_SIZE * 2;
export const CLS_DIMS = HIDDEN_SIZE;

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

let modelPromise: Promise<PreTrainedModel> | undefined;

/**
 * Windows machines get the GPU through DirectML, which ships with onnxruntime-node. On the GPU the model
 * runs in half precision: ~1.8x faster than fp32 and within cosine 0.9999 of it, less than the error the
 * Int8 index already accepts. The CPU keeps fp32, where half precision would be slower, not faster.
 */
const preferredDevices = (): Array<"dml" | "cpu"> => {
  if (env.RECOGNITION_DEVICE !== "auto") return [env.RECOGNITION_DEVICE];
  return process.platform === "win32" ? ["dml", "cpu"] : ["cpu"];
};

/** Downloads the model on first use (~90MB, cached under RECOGNITION_DIR/models) and keeps it in memory. */
const loadModel = (): Promise<PreTrainedModel> => {
  if (!modelPromise) {
    hfEnv.cacheDir = path.join(env.RECOGNITION_DIR, "models");
    modelPromise = (async () => {
      let lastError: unknown;
      for (const device of preferredDevices()) {
        try {
          return await AutoModel.from_pretrained(EMBEDDING_MODEL, { dtype: device === "dml" ? "fp16" : "fp32", device });
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    })();
  }
  return modelPromise;
};

const normalise = (vector: Float32Array): void => {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < vector.length; i++) vector[i] = vector[i]! / norm;
};

/** Decodes an image into the model's input layout: RGB, card-shaped, ImageNet-normalised, channels first. */
const writePixels = async (image: Buffer, out: Float32Array, offset: number): Promise<void> => {
  const pixels = await sharp(image)
    .rotate()
    .removeAlpha()
    .toColourspace("srgb")
    .resize(INPUT_WIDTH, INPUT_HEIGHT, { fit: "fill" })
    .raw()
    .toBuffer();
  const plane = INPUT_WIDTH * INPUT_HEIGHT;
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      out[offset + c * plane + i] = (pixels[i * 3 + c]! / 255 - MEAN[c]!) / STD[c]!;
    }
  }
};

const INPUT_SIZE = 3 * INPUT_WIDTH * INPUT_HEIGHT;

/** A batch decoded into model input. Images that fail to decode are left out and listed in `skipped`. */
export interface PreparedBatch {
  input: Float32Array;
  count: number;
  skipped: number[];
}

/**
 * Decodes and resizes images on the thread pool. Separate from `embedPrepared` so a caller can prepare the
 * next batch while the model is busy with the current one.
 */
export const prepareImages = async (images: Buffer[]): Promise<PreparedBatch> => {
  const decoded = await Promise.allSettled(
    images.map(async (image) => {
      const pixels = new Float32Array(INPUT_SIZE);
      await writePixels(image, pixels, 0);
      return pixels;
    }),
  );
  const skipped: number[] = [];
  const good: Float32Array[] = [];
  decoded.forEach((result, i) => (result.status === "fulfilled" ? good.push(result.value) : skipped.push(i)));

  const input = new Float32Array(good.length * INPUT_SIZE);
  good.forEach((pixels, i) => input.set(pixels, i * INPUT_SIZE));
  return { input, count: good.length, skipped };
};

/** Runs the model on a prepared batch: one unit-length vector per image, similar cards land close. */
export const embedPrepared = async ({ input, count }: PreparedBatch): Promise<Float32Array[]> => {
  if (count === 0) return [];
  const model = await loadModel();
  const output = await model({
    pixel_values: new Tensor("float32", input, [count, 3, INPUT_HEIGHT, INPUT_WIDTH]),
  });
  const hidden = output.last_hidden_state as Tensor;
  const [batch, tokens, dims] = hidden.dims as [number, number, number];
  const values = Float32Array.from(hidden.data as ArrayLike<number>);

  return Array.from({ length: batch }, (_, b) => {
    const base = b * tokens * dims;
    const vector = new Float32Array(EMBEDDING_DIM);
    for (let d = 0; d < dims; d++) vector[d] = values[base + d]!;
    for (let t = 1; t < tokens; t++) {
      for (let d = 0; d < dims; d++) vector[dims + d] = vector[dims + d]! + values[base + t * dims + d]!;
    }
    normalise(vector.subarray(0, dims));
    normalise(vector.subarray(dims));
    return vector;
  });
};

/** One unit-length vector per image. Throws if any image cannot be decoded. */
export const embedImages = async (images: Buffer[]): Promise<Float32Array[]> => {
  const batch = await prepareImages(images);
  if (batch.skipped.length) throw new Error("An image could not be decoded");
  return embedPrepared(batch);
};

/** Loads the model ahead of the first scan, so that request is not the one paying the download. */
export const warmUpEmbedder = async (): Promise<void> => {
  await loadModel();
};
