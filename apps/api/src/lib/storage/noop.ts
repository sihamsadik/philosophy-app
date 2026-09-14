// No-op / Disabled storage provider. Used when STORAGE_PROVIDER=none or when no S3/MinIO bucket is configured.
import type { StorageProvider } from "./provider.js";

export class NoopStorageProvider implements StorageProvider {
  async init(): Promise<void> {
    // No-op init
  }

  async put(key: string, _bytes: Uint8Array, _contentType: string): Promise<string> {
    return `/media/${key}`;
  }

  publicUrl(key: string): string {
    return `/media/${key}`;
  }

  async remove(_keys: string[]): Promise<void> {
    // No-op remove
  }
}
