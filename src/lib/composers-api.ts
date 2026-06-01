import { supabase } from "@/integrations/supabase/client";

export type Availability = "available" | "partial" | "unavailable";
export type FilmFormat = "feature" | "series" | "doc" | "short" | "spot" | "game" | "other";

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function photoUrl(path?: string | null) {
  if (!path) return null;
  return supabase.storage.from("composer-photos").getPublicUrl(path).data.publicUrl;
}

export async function uploadComposerPhoto(composerId: string, file: File) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${composerId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("composer-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function fetchCatalogs() {
  const [styles, genres, languages, fees] = await Promise.all([
    supabase.from("music_styles").select("id, slug, label_es").order("position"),
    supabase.from("av_genres").select("id, slug, label_es").order("position"),
    supabase.from("languages").select("code, label_es").order("label_es"),
    supabase.from("fee_ranges").select("id, code, label").order("position"),
  ]);
  if (styles.error) throw styles.error;
  if (genres.error) throw genres.error;
  if (languages.error) throw languages.error;
  if (fees.error) throw fees.error;
  return {
    styles: styles.data!,
    genres: genres.data!,
    languages: languages.data!,
    fees: fees.data!,
  };
}