import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  enrichPending,
  fetchDetail,
  importYearPageLite,
  requireAdmin,
  runSync,
  searchInput,
  tmdbFetch,
} from "@/lib/producciones-espanolas.server";

/** Busca en TMDb (cine y TV) y marca los resultados ya importados en la base local. */
export const searchTmdbEspanolas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => searchInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const types = data.mediaType === "all" ? (["movie", "tv"] as const) : ([data.mediaType] as const);

    const pages = await Promise.all(
      types.map(async (t) => {
        const params: Record<string, string> = { query: data.query, language: "es-ES", include_adult: "false" };
        if (data.year) params[t === "movie" ? "year" : "first_air_date_year"] = String(data.year);
        const json = await tmdbFetch(`/search/${t}`, params);
        return ((json.results ?? []) as any[]).map((r) => ({
          tmdb_id: r.id as number,
          media_type: t as "movie" | "tv",
          title: (r.title ?? r.name ?? "") as string,
          title_original: (r.original_title ?? r.original_name ?? null) as string | null,
          year: Number(String(r.release_date ?? r.first_air_date ?? "").slice(0, 4)) || null,
          poster_path: (r.poster_path ?? null) as string | null,
          synopsis: (r.overview ?? null) as string | null,
          countries: (r.origin_country ?? []) as string[],
        }));
      }),
    );

    const results = pages.flat().sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 30);
    const { data: existing } = await admin
      .from("producciones_espanolas")
      .select("tmdb_id, media_type")
      .in("tmdb_id", results.map((r) => r.tmdb_id));
    const imported = new Set(((existing ?? []) as any[]).map((r) => `${r.media_type}-${r.tmdb_id}`));

    return results.map((r) => ({ ...r, already_imported: imported.has(`${r.media_type}-${r.tmdb_id}`) }));
  });

/** Importa una producción desde TMDb a producciones_espanolas (upsert por tmdb_id). */
export const importProduccionEspanola = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ tmdbId: z.number().int(), mediaType: z.enum(["movie", "tv"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const row = await fetchDetail(data.tmdbId, data.mediaType);
    const { data: saved, error } = await admin
      .from("producciones_espanolas")
      .upsert(row, { onConflict: "tmdb_id,media_type" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (saved as any).id as string };
  });

/** Refresca los campos mutables (estreno, plataforma, estado) de las fichas importadas. */
export const syncProduccionesEspanolas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).passthrough().optional().parse(input ?? {}))
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context.userId);
    return runSync(admin);
  });

/**
 * Importa (upsert) una página de películas españolas de un año concreto desde TMDb.
 * El cliente encadena páginas y años para poder mostrar progreso.
 */
export const importEspanolasYearPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        year: z.number().int().min(1900).max(2100),
        page: z.number().int().min(1).max(500),
        mediaType: z.enum(["movie", "tv"]).default("movie"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    return importYearPageLite(admin, data.year, data.page, data.mediaType);
  });

/** Completa por lotes los créditos musicales y la taquilla de las fichas importadas. */
export const enrichEspanolas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(40).default(24) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    return enrichPending(admin, data.limit);
  });
