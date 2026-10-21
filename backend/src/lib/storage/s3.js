import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3StorageAdapter {
  constructor({ bucket, region, endpoint, accessKeyId, secretAccessKey }) {
    this.bucket = bucket;
    const clientConfig = {
      region: region || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for Neon / MinIO / S3-compatible endpoints
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    };

    if (endpoint) {
      clientConfig.endpoint = endpoint;
    }

    this.s3 = new S3Client(clientConfig);
  }

  async upload({ key, buffer, contentType }) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await this.s3.send(command);
    return { key };
  }

  async delete(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3.send(command);
  }

  async getSignedUrl(key, expiresInSeconds = 120) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
}
