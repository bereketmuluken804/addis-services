import sharp from 'sharp';

/**
 * Optimizes an ID document image buffer for fast network delivery
 * while preserving high legibility for text, numbers, stamps, and credentials.
 *
 * - Resizes high-resolution camera photos to fit within 2000x2000 without enlargement
 * - Compresses to progressive JPEG at quality 85
 * - Falls back to original buffer if sharp cannot process (e.g., mock test buffers)
 *
 * @param {Object} file - Object containing { buffer, verifiedMime, verifiedExt }
 * @returns {Promise<{ buffer: Buffer, contentType: string, ext: string }>}
 */
export async function optimizeIdDocument(file) {
  let uploadBuffer = file.buffer;
  let contentType = file.verifiedMime || 'image/jpeg';
  let ext = file.verifiedExt || 'jpg';

  try {
    uploadBuffer = await sharp(file.buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    contentType = 'image/jpeg';
    ext = 'jpg';
  } catch {
    // Graceful fallback to original buffer if sharp fails (e.g., test mocks)
  }

  return {
    buffer: uploadBuffer,
    contentType,
    ext,
  };
}

/**
 * Optimizes an avatar image buffer for fast thumbnail and profile delivery.
 *
 * - Resizes to 600x800 with cover fit without enlargement
 * - Compresses to progressive JPEG at quality 80
 * - Falls back to original buffer if sharp fails
 *
 * @param {Object} file - Object containing { buffer, verifiedMime, verifiedExt }
 * @returns {Promise<{ buffer: Buffer, contentType: string, ext: string }>}
 */
export async function optimizeAvatar(file) {
  let uploadBuffer = file.buffer;
  let contentType = file.verifiedMime || 'image/jpeg';
  let ext = file.verifiedExt || 'jpg';

  try {
    uploadBuffer = await sharp(file.buffer)
      .resize(600, 800, { fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();
    contentType = 'image/jpeg';
    ext = 'jpg';
  } catch {
    // Graceful fallback to original buffer
  }

  return {
    buffer: uploadBuffer,
    contentType,
    ext,
  };
}
