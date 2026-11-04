import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizeIdDocument, optimizeAvatar } from '../../src/lib/image.js';

describe('Image Optimization Service (src/lib/image.js)', () => {
  it('compresses and bounds a high-resolution ID document image to 2000x2000 max', async () => {
    // Create a 2400 x 1800 test image in memory
    const rawBuffer = await sharp({
      create: {
        width: 2400,
        height: 1800,
        channels: 3,
        background: { r: 120, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const file = {
      buffer: rawBuffer,
      verifiedMime: 'image/png',
      verifiedExt: 'png',
    };

    const optimized = await optimizeIdDocument(file);

    expect(optimized.contentType).toBe('image/jpeg');
    expect(optimized.ext).toBe('jpg');
    expect(optimized.buffer).toBeInstanceOf(Buffer);

    // Verify dimensions of optimized image
    const metadata = await sharp(optimized.buffer).metadata();
    expect(metadata.width).toBeLessThanOrEqual(2000);
    expect(metadata.height).toBeLessThanOrEqual(2000);
    expect(metadata.format).toBe('jpeg');
    // Aspect ratio preserved: 2400x1800 -> 2000x1500
    expect(metadata.width).toBe(2000);
    expect(metadata.height).toBe(1500);
    // File size should be compressed
    expect(optimized.buffer.length).toBeLessThan(rawBuffer.length);
  });

  it('does not enlarge images smaller than 2000x2000', async () => {
    const rawBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 50, g: 100, b: 150 },
      },
    })
      .jpeg()
      .toBuffer();

    const file = {
      buffer: rawBuffer,
      verifiedMime: 'image/jpeg',
      verifiedExt: 'jpg',
    };

    const optimized = await optimizeIdDocument(file);
    const metadata = await sharp(optimized.buffer).metadata();

    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(600);
  });

  it('gracefully falls back to original buffer when sharp fails on mock/invalid buffer', async () => {
    const fakeBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const file = {
      buffer: fakeBuffer,
      verifiedMime: 'image/jpeg',
      verifiedExt: 'jpg',
    };

    const result = await optimizeIdDocument(file);

    expect(result.buffer).toBe(fakeBuffer);
    expect(result.contentType).toBe('image/jpeg');
    expect(result.ext).toBe('jpg');
  });

  it('optimizes avatar image to 600x800 dimensions', async () => {
    const rawBuffer = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 3,
        background: { r: 200, g: 100, b: 50 },
      },
    })
      .png()
      .toBuffer();

    const file = {
      buffer: rawBuffer,
      verifiedMime: 'image/png',
      verifiedExt: 'png',
    };

    const optimized = await optimizeAvatar(file);
    const metadata = await sharp(optimized.buffer).metadata();

    expect(optimized.contentType).toBe('image/jpeg');
    expect(optimized.ext).toBe('jpg');
    expect(metadata.width).toBe(600);
    expect(metadata.height).toBe(800);
    expect(metadata.format).toBe('jpeg');
  });

  it('gracefully falls back for avatar when given an invalid buffer', async () => {
    const fakeBuffer = Buffer.from('invalid-non-image-data');
    const file = {
      buffer: fakeBuffer,
      verifiedMime: 'image/png',
      verifiedExt: 'png',
    };

    const result = await optimizeAvatar(file);

    expect(result.buffer).toBe(fakeBuffer);
    expect(result.contentType).toBe('image/png');
    expect(result.ext).toBe('png');
  });
});
