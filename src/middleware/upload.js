import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

// Multer memory storage — files must never touch disk (spec Invariant #4 & §7)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.ID_DOCUMENT_MAX_BYTES, // Default 10MB
    files: 1,
  },
});

/**
 * Sniffs magic bytes to determine real image type without trusting client headers.
 * Supported: JPEG, PNG, WebP.
 */
export function sniffImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // 3. WebP: Starts with 'RIFF' (0-3) and contains 'WEBP' (8-11)
  const isRiff =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isRiff && isWebp) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

/**
 * Middleware handling single idDocument upload and validating magic bytes.
 */
export const uploadIdDocument = [
  upload.single('idDocument'),
  (req, res, next) => {
    if (!req.file) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'ID document file (idDocument) is required')
      );
    }

    const detected = sniffImageMagicBytes(req.file.buffer);
    if (!detected) {
      return next(
        new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Only JPEG, PNG, and WebP image formats are accepted'
        )
      );
    }

    // Attach verified mime and extension
    req.file.verifiedMime = detected.mime;
    req.file.verifiedExt = detected.ext;

    next();
  },
];
