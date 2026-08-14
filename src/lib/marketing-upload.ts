import { removeFromBucket, signBucketPath, uploadToBucket } from "@/lib/storage-upload";

/**
 * Marketing usa el bucket privado `marketing-assets`.
 * La lógica común vive en `@/lib/storage-upload`; aquí solo se fija el bucket.
 */
const BUCKET = "marketing-assets";

/** Sube un archivo a la carpeta lógica (decks, clippings, brand, case-studies, press-kits…). */
export function uploadMarketingAsset(folder: string, file: File): Promise<string> {
  return uploadToBucket(BUCKET, folder, file);
}

export function signMarketingAsset(path: string, expiresIn = 60 * 60): Promise<string | null> {
  return signBucketPath(BUCKET, path, expiresIn);
}

export function deleteMarketingAsset(path: string): Promise<void> {
  return removeFromBucket(BUCKET, path);
}
