import { env } from '../../config/env.js';
import { S3StorageAdapter } from './s3.js';
import { MemoryStorageAdapter } from './memory.js';

let storageInstance;

export function getStorage() {
  if (!storageInstance) {
    if (env.NODE_ENV === 'test') {
      storageInstance = new MemoryStorageAdapter();
      return storageInstance;
    }

    const hasS3Config =
      env.CLOUD_STORAGE_BUCKET &&
      env.CLOUD_STORAGE_ACCESS_KEY_ID &&
      env.CLOUD_STORAGE_SECRET_ACCESS_KEY;

    if (!hasS3Config) {
      if (env.NODE_ENV === 'production') {
        throw new Error(
          'FATAL: Production storage requires CLOUD_STORAGE_BUCKET, CLOUD_STORAGE_ACCESS_KEY_ID, and CLOUD_STORAGE_SECRET_ACCESS_KEY.'
        );
      }
      console.warn(
        '[storage] WARNING: S3 credentials incomplete (missing CLOUD_STORAGE_SECRET_ACCESS_KEY). Using MemoryStorage until secret key is configured.'
      );
      storageInstance = new MemoryStorageAdapter();
    } else {
      storageInstance = new S3StorageAdapter({
        bucket: env.CLOUD_STORAGE_BUCKET,
        region: env.CLOUD_STORAGE_REGION,
        endpoint: env.CLOUD_STORAGE_ENDPOINT,
        accessKeyId: env.CLOUD_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUD_STORAGE_SECRET_ACCESS_KEY,
      });
    }
  }
  return storageInstance;
}

export function setStorage(customStorage) {
  storageInstance = customStorage;
}

export const storage = getStorage();
