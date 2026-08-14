import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Punto único de subida/firma/borrado de archivos en Storage.
 * No dupliques `supabase.storage.from(...)` en componentes: usa estos helpers
 * (y el componente `FileDropzone`) para que mensajes, nombres de archivo y
 * caducidad de las URLs firmadas sean iguales en toda la app.
 */

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

/** Sube un archivo y devuelve la ruta de almacenamiento. */
export async function uploadToBucket(
  bucket: string,
  folder: string,
  file: File,
  opts: { upsert?: boolean; keepName?: boolean } = {},
): Promise<string> {
  const base = opts.keepName === false ? (file.name.split(".").pop() || "bin") : safeFileName(file.name);
  const filename = opts.keepName === false ? `${crypto.randomUUID()}.${base}` : `${crypto.randomUUID()}-${base}`;
  const path = folder ? `${folder}/${filename}` : filename;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: opts.upsert ?? false,
  });
  if (error) throw error;
  return path;
}

/** URL firmada (null si no hay ruta o falla la firma). */
export async function signBucketPath(
  bucket: string,
  path: string | null | undefined,
  expiresIn = 60 * 60,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function removeFromBucket(bucket: string, path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

/** Hook de URL firmada con caché (se refresca antes de caducar). */
export function useSignedUrl(bucket: string, path?: string | null, expiresIn = 60 * 60) {
  return useQuery({
    queryKey: ["signed-url", bucket, path],
    enabled: !!path,
    staleTime: 1000 * 60 * 50,
    queryFn: () => signBucketPath(bucket, path, expiresIn),
  });
}
