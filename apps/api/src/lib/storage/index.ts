// Picks the storage backend once, at first use, from STORAGE_PROVIDER. `lib/storage.ts` delegates
// `uploadBytes`/`publicUrl` to the returned provider, so the choice is invisible to call sites.
import { env } from "../env.js";
import type { StorageProvider } from "./provider.js";
import { SupabaseStorageProvider } from "./supabase.js";
import { S3StorageProvider } from "./s3.js";
import { NoopStorageProvider } from "./noop.js";

let provider: StorageProvider | null = null;

/** The configured storage backend (memoized singleton). */
export function getStorage(): StorageProvider {
  if (provider) return provider;
  if (env.STORAGE_PROVIDER === "none" || env.STORAGE_PROVIDER === "disabled") {
    provider = new NoopStorageProvider();
  } else if (env.STORAGE_PROVIDER === "s3" && env.S3_ENDPOINT) {
    provider = new S3StorageProvider();
  } else if (env.STORAGE_PROVIDER === "supabase" && env.SUPABASE_URL) {
    provider = new SupabaseStorageProvider();
  } else {
    provider = new NoopStorageProvider();
  }
  return provider;
}

/** Test-only: drop the memoized provider so a fresh STORAGE_PROVIDER takes effect. */
export function resetStorageForTest(): void {
  provider = null;
}

/** Test-only: inject a fake provider (integration tests run hermetic — no real storage backend). */
export function setStorageForTest(p: StorageProvider | null): void {
  provider = p;
}

export type { StorageProvider } from "./provider.js";
