import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

/**
 * Object storage abstraction for uploads (listing photos, avatars, KYC documents).
 *
 * - `local` (default): files live under `<data dir>/uploads`; public objects are served by Express at
 *   `/uploads/<key>`, private ones only through the authenticated `/api/v1/files/:id` endpoint.
 * - `s3`: any S3-compatible bucket (AWS S3, Cloudflare R2, MinIO). Public objects are addressed through
 *   `S3_PUBLIC_BASE_URL`; private ones through short-lived presigned URLs.
 */

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  contentType: string;
  isPublic: boolean;
}

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string, isPublic: boolean): Promise<StoredObject>;
  /** Streams a file from disk (used for database backups, which must not be buffered in memory). */
  putFile(key: string, filePath: string, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  remove(key: string): Promise<void>;
  /** URL a browser can use right now (public URL or a short-lived signed one). */
  urlFor(key: string, isPublic: boolean): Promise<string>;
}

const PUBLIC_PREFIX = 'public/';
const PRIVATE_PREFIX = 'private/';

export function makeKey(purpose: string, filename: string, isPublic: boolean): string {
  const ext = (path.extname(filename) || '')
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .slice(0, 10);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  return `${isPublic ? PUBLIC_PREFIX : PRIVATE_PREFIX}${purpose}/${stamp}/${crypto.randomBytes(12).toString('hex')}${ext}`;
}

export const isPublicKey = (key: string) => key.startsWith(PUBLIC_PREFIX);

// ---------------------------------------------------------------------------------------------

class LocalDriver implements StorageDriver {
  private root = config.storage.uploadsDir;

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root))) throw new Error('Invalid storage key');
    return full;
  }

  async put(key: string, body: Buffer, contentType: string, isPublic: boolean): Promise<StoredObject> {
    const full = this.resolve(key);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, body);
    await fs.promises.writeFile(`${full}.meta.json`, JSON.stringify({ contentType }));
    return { key, url: await this.urlFor(key, isPublic), size: body.length, contentType, isPublic };
  }

  async putFile(key: string, filePath: string, contentType: string): Promise<StoredObject> {
    const full = this.resolve(key);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.copyFile(filePath, full);
    await fs.promises.writeFile(`${full}.meta.json`, JSON.stringify({ contentType }));
    const { size } = await fs.promises.stat(full);
    return { key, url: await this.urlFor(key, false), size, contentType, isPublic: false };
  }

  async get(key: string) {
    const full = this.resolve(key);
    try {
      const [body, meta] = await Promise.all([
        fs.promises.readFile(full),
        fs.promises.readFile(`${full}.meta.json`, 'utf8').catch(() => '{}'),
      ]);
      return { body, contentType: (JSON.parse(meta).contentType as string) || 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    const full = this.resolve(key);
    await Promise.all([fs.promises.rm(full, { force: true }), fs.promises.rm(`${full}.meta.json`, { force: true })]);
  }

  async urlFor(key: string, isPublic: boolean): Promise<string> {
    return isPublic ? `/uploads/${key}` : `/api/v1/files/${encodeURIComponent(key)}`;
  }
}

class S3Driver implements StorageDriver {
  private clientPromise: Promise<any> | null = null;

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = import('@aws-sdk/client-s3').then((m) => ({
        m,
        client: new m.S3Client({
          region: config.storage.s3.region,
          endpoint: config.storage.s3.endpoint,
          forcePathStyle: config.storage.s3.forcePathStyle,
          credentials: {
            accessKeyId: config.storage.s3.accessKeyId,
            secretAccessKey: config.storage.s3.secretAccessKey,
          },
        }),
      }));
    }
    return this.clientPromise;
  }

  async put(key: string, body: Buffer, contentType: string, isPublic: boolean): Promise<StoredObject> {
    const { m, client } = await this.client();
    await client.send(
      new m.PutObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(isPublic && !config.storage.s3.publicBaseUrl ? { ACL: 'public-read' } : {}),
      })
    );
    return { key, url: await this.urlFor(key, isPublic), size: body.length, contentType, isPublic };
  }

  async putFile(key: string, filePath: string, contentType: string): Promise<StoredObject> {
    const { m, client } = await this.client();
    const { size } = await fs.promises.stat(filePath);
    await client.send(
      new m.PutObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentLength: size,
        ContentType: contentType,
      })
    );
    return { key, url: await this.urlFor(key, false), size, contentType, isPublic: false };
  }

  async get(key: string) {
    const { m, client } = await this.client();
    try {
      const res = await client.send(new m.GetObjectCommand({ Bucket: config.storage.s3.bucket, Key: key }));
      const body = Buffer.from(await res.Body.transformToByteArray());
      return { body, contentType: res.ContentType || 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    const { m, client } = await this.client();
    await client.send(new m.DeleteObjectCommand({ Bucket: config.storage.s3.bucket, Key: key }));
  }

  async urlFor(key: string, isPublic: boolean): Promise<string> {
    if (isPublic && config.storage.s3.publicBaseUrl) return `${config.storage.s3.publicBaseUrl}/${key}`;
    if (isPublic) return `/uploads/${key}`; // proxied through the app when no CDN base is configured
    return `/api/v1/files/${encodeURIComponent(key)}`;
  }

  /** Short-lived direct download link (used by the files endpoint to avoid proxying large objects). */
  async presign(key: string, seconds = 300): Promise<string> {
    const { m, client } = await this.client();
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    return getSignedUrl(client, new m.GetObjectCommand({ Bucket: config.storage.s3.bucket, Key: key }), {
      expiresIn: seconds,
    });
  }
}

export const storage: StorageDriver & { presign?: (key: string, seconds?: number) => Promise<string> } =
  config.storage.driver === 's3' && config.storage.s3.bucket ? new S3Driver() : new LocalDriver();

export const storageDriverName = config.storage.driver === 's3' && config.storage.s3.bucket ? 's3' : 'local';
