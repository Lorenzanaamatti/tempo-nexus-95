import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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

/**
 * Hook that returns a short-lived signed URL for a composer photo.
 * The `composer-photos` bucket is private; reads must go through signed URLs.
 */
export function useComposerPhotoUrl(path?: string | null) {
  return useQuery({
    queryKey: ["composer-photo-signed", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 50, // refresh before 1h expiry
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("composer-photos")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
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