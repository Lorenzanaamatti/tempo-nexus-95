import { z } from "zod";

const TMDB_BASE = "https://api.themoviedb.org/3";

export const searchInput = z.object({
  query: z.string().trim().min(1),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  mediaType: z.enum(["movie", "tv", "all"]).default("all"),
});

export async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const token = process.env['TMDB_READ_TOKEN'];
  if (!token) throw new Error("TMDB_READ_TOKEN no configurado");
  const url = new URL(TMDB_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDb ${res.status}`);
  return res.json() as Promise<any>;
}

export async function requireAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Solo administradores");
  return supabaseAdmin as any;
}

export async function fetchDetail(tmdbId: number, mediaType: "movie" | "tv") {
  const detail = await tmdbFetch(`/${mediaType}/${tmdbId}`, {
    language: "es-ES",
    append_to_response: "credits,watch/providers",
  });
  const crew: any[] = detail.credits?.crew ?? [];
  const directors = mediaType === "movie"
    ? crew.filter((c) => c.job === "Director").map((c) => c.name as string)
    : ((detail.created_by ?? []) as any[]).map((c) => c.name as string);
  const providers = detail["watch/providers"]?.results?.ES?.flatrate ?? [];
  const release: string | null = detail.release_date ?? detail.first_air_date ?? null;

  return {
    tmdb_id: detail.id as number,
    media_type: mediaType,
    title: (detail.title ?? detail.name ?? "") as string,
    title_es: (detail.title ?? detail.name ?? null) as string | null,
    title_original: (detail.original_title ?? detail.original_name ?? null) as string | null,
    year: release ? Number(release.slice(0, 4)) || null : null,
    release_date: release || null,
    poster_path: (detail.poster_path ?? null) as string | null,
    backdrop_path: (detail.backdrop_path ?? null) as string | null,
    directors,
    production_companies: ((detail.production_companies ?? []) as any[]).map((c) => c.name as string),
    genres: ((detail.genres ?? []) as any[]).map((g) => g.name as string),
    runtime: (detail.runtime ?? detail.episode_run_time?.[0] ?? null) as number | null,
    platform: (providers[0]?.provider_name ?? null) as string | null,
    countries: ((detail.production_countries ?? []) as any[]).map((c) => c.iso_3166_1 as string),
    synopsis: (detail.overview ?? null) as string | null,
    tmdb_url: `https://www.themoviedb.org/${mediaType}/${detail.id}`,
    tmdb_status: (detail.status ?? null) as string | null,
    last_synced_at: new Date().toISOString(),
  };
}

export async function runSync(admin: any) {
  const { data: rows, error } = await admin
    .from("producciones_espanolas")
    .select("id, tmdb_id, media_type")
    .not("tmdb_id", "is", null)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(80);
  if (error) throw new Error(error.message);

  let updated = 0;
  for (const r of (rows ?? []) as any[]) {
    try {
      const detail = await fetchDetail(r.tmdb_id, r.media_type === "tv" ? "tv" : "movie");
      await admin
        .from("producciones_espanolas")
        .update({
          release_date: detail.release_date,
          year: detail.year,
          platform: detail.platform,
          tmdb_status: detail.tmdb_status,
          poster_path: detail.poster_path,
          last_synced_at: detail.last_synced_at,
        })
        .eq("id", r.id);
      updated += 1;
    } catch {
      /* ignora fallos puntuales de la API */
    }
  }
  return { updated };
}
