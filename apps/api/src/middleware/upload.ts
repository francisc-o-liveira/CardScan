import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { Errors } from "../utils/AppError";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (_req, file, accept) => accept(null, file.mimetype.startsWith("image/")),
}).single("image");

/** Accepts one photo in the multipart field "image", kept in memory, and turns upload errors into 400s. */
export const uploadPhoto = (req: Request, res: Response, next: NextFunction) => {
  photoUpload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      return next(
        Errors.validation(error.code === "LIMIT_FILE_SIZE" ? "The photo is larger than 10MB" : "The photo could not be uploaded"),
      );
    }
    if (error) return next(error);
    if (!req.file) return next(Errors.validation("Attach a photo of the card in the 'image' field"));
    next();
  });
};
