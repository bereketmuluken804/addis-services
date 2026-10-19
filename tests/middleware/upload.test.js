import { describe, it, expect } from 'vitest';
import { sniffImageMagicBytes } from '../../src/middleware/upload.js';

describe('Upload Validation & Magic Bytes (src/middleware/upload.js)', () => {
  it('detects valid JPEG magic bytes', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const detected = sniffImageMagicBytes(jpegBuffer);
    expect(detected).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
  });

  it('detects valid PNG magic bytes', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const detected = sniffImageMagicBytes(pngBuffer);
    expect(detected).toEqual({ mime: 'image/png', ext: 'png' });
  });

  it('detects valid WebP magic bytes', () => {
    // RIFF....WEBP
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x20, 0x00, 0x00, 0x00, // Length
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    const detected = sniffImageMagicBytes(webpBuffer);
    expect(detected).toEqual({ mime: 'image/webp', ext: 'webp' });
  });

  it('rejects spoofed extensions (e.g. text/exe file with .jpg extension)', () => {
    const fakeBuffer = Buffer.from('This is a text file, not a real image at all!');
    expect(sniffImageMagicBytes(fakeBuffer)).toBeNull();
  });

  it('rejects empty or too-small buffers', () => {
    expect(sniffImageMagicBytes(Buffer.alloc(0))).toBeNull();
    expect(sniffImageMagicBytes(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
