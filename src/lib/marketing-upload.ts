import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to the private `marketing-assets` bucket and returns the storage path.
 * Folder = logical category (decks, clippings, brand, case-studies, press-kits…).
 */
export async function uploadMarketingAsset(folder: string, file: File): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `${folder}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from("marketing-assets").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signMarketingAsset(path: string, expiresIn = 60 * 60): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("marketing-assets")
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function deleteMarketingAsset(path: string): Promise<void> {
  if (!path) return;
  await supabase.storage.from("marketing-assets").remove([path]);
}