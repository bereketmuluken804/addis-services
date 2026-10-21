/**
 * In-memory storage adapter for testing.
 * Implements the exact same interface as S3StorageAdapter.
 */
export class MemoryStorageAdapter {
  constructor() {
    this.files = new Map();
  }

  async upload({ key, buffer, contentType }) {
    this.files.set(key, {
      buffer: Buffer.from(buffer),
      contentType,
      uploadedAt: new Date(),
    });
    return { key };
  }

  async delete(key) {
    this.files.delete(key);
  }

  async getSignedUrl(key, expiresInSeconds = 120) {
    if (!this.files.has(key)) {
      throw new Error(`File not found: ${key}`);
    }
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    return `https://fake-storage.local/${key}?expires=${expiresAt}`;
  }

  async getObject(key) {
    const file = this.files.get(key);
    if (!file) {
      throw new Error(`File not found: ${key}`);
    }
    return file;
  }

  has(key) {
    return this.files.has(key);
  }

  clear() {
    this.files.clear();
  }
}
