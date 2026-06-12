import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TMDB_BASE = "https://api.themoviedb.org/3";

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error("TMDB_READ_TOKEN no configurado");
  const url = new URL(TMDB_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDb ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

type TmdbCrew = { job: string; department: string; name: string };
type TmdbProvider = { provider_name: string };

async function adminCheck(userId: string) {
  const { supabase } = await import("@/integrations/supabase/client.server").then(
    async (m) => ({ supabase: m.supabaseAdmin }),
  );
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Solo administradores");
}

/**
 * Importa las películas españolas de un año desde TMDb y las guarda (upsert por tmdb_id).
 * Hace matching estricto contra el roster (composers/directors/production_companies).
 */
export const importSpanishFilmsByYear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ year: z.number().int().min(1900).max(2100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await adminCheck(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Precarga roster para matching
    const [{ data: composers }, { data: directors }, { data: companies }] = await Promise.all([
      supabaseAdmin.from("composers").select("id, full_name, artistic_name, roster_role"),
      supabaseAdmin.from("directors").select("id, full_name"),
      supabaseAdmin.from("production_companies").select("id, name, legal_name"),
    ]);
    const peopleRes = await supabaseAdmin.from("people").select("id, composer_id");
    const personByComposer = new Map<string, string>();
    for (const p of peopleRes.data ?? []) {
      if (p.composer_id) personByComposer.set(p.composer_id, p.id);
    }

    function findComposerPersonId(name: string, role: "composer" | "supervisor"): string | null {
      const n = normalize(name);
      if (!n) return null;
      const matches = (composers ?? []).filter(
        (c) =>
          c.roster_role === role &&
          (normalize(c.full_name) === n || normalize(c.artistic_name) === n),
      );
      if (matches.length !== 1) return null;
      return personByComposer.get(matches[0].id) ?? null;
    }
    function findDirectorIds(names: string[]): string[] {
      const out: string[] = [];
      for (const name of names) {
        const n = normalize(name);
        const m = (directors ?? []).filter((d) => normalize(d.full_name) === n);
        if (m.length === 1) out.push(m[0].id);
      }
      return out;
    }
    function findCompanyIds(names: string[]): string[] {
      const out: string[] = [];
      for (const name of names) {
        const n = normalize(name);
        const m = (companies ?? []).filter(
          (c) => normalize(c.name) === n || normalize(c.legal_name) === n,
        );
        if (m.length === 1) out.push(m[0].id);
      }
      return out;
    }

    let imported = 0;
    let updated = 0;
    let needsReview = 0;

    // Pagina hasta 5 páginas (100 películas)
    for (let page = 1; page <= 5; page++) {
      const list = (await tmdbFetch("/discover/movie", {
        with_origin_country: "ES",
        primary_release_year: String(data.year),
        sort_by: "popularity.desc",
        page: String(page),
      })) as { results: { id: number }[]; total_pages: number };

      if (!list.results?.length) break;

      for (const r of list.results) {
        const detail = (await tmdbFetch(`/movie/${r.id}`, {
          append_to_response: "credits,watch/providers",
        })) as {
          id: number;
          title: string;
          original_title: string;
          release_date: string | null;
          poster_path: string | null;
          overview: string | null;
          revenue: number | null;
          production_companies: { name: string }[];
          credits: { crew: TmdbCrew[] };
          ["watch/providers"]?: { results?: { ES?: { flatrate?: TmdbProvider[] } } };
        };

        const crew = detail.credits?.crew ?? [];
        const directorsNames = crew.filter((c) => c.job === "Director").map((c) => c.name);
        const composerName =
          crew.find((c) => c.job === "Original Music Composer")?.name ??
          crew.find((c) => c.department === "Sound" && c.job === "Music")?.name ??
          null;
        const supervisorName =
          crew.find((c) => c.job === "Music Supervisor")?.name ?? null;
        const companiesNames = (detail.production_companies ?? []).map((c) => c.name);
        const platform =
          detail["watch/providers"]?.results?.ES?.flatrate?.[0]?.provider_name ?? null;

        const reasons: string[] = [];
        if (!composerName) reasons.push("Falta compositor BSO");
        if (!supervisorName) reasons.push("Falta supervisor musical");
        if (!platform) reasons.push("Falta plataforma");

        const directorIds = findDirectorIds(directorsNames);
        const companyIds = findCompanyIds(companiesNames);
        const composerPersonId = composerName ? findComposerPersonId(composerName, "composer") : null;
        const supervisorPersonId = supervisorName
          ? findComposerPersonId(supervisorName, "supervisor")
          : null;

        const payload = {
          tmdb_id: detail.id,
          year: data.year,
          title: detail.title,
          original_title: detail.original_title,
          release_date: detail.release_date || null,
          poster_path: detail.poster_path,
          overview: detail.overview,
          directors: directorsNames,
          production_companies: companiesNames,
          composer: composerName,
          music_supervisor: supervisorName,
          platform,
          box_office_eur: detail.revenue ? Number(detail.revenue) : null,
          director_ids: directorIds,
          production_company_ids: companyIds,
          composer_person_id: composerPersonId,
          music_supervisor_person_id: supervisorPersonId,
          needs_review: reasons.length > 0,
          review_reason: reasons.length ? reasons.join(" · ") : null,
          last_synced_at: new Date().toISOString(),
        };
        if (payload.needs_review) needsReview++;

        const { data: existing } = await supabaseAdmin
          .from("spanish_films")
          .select("id")
          .eq("tmdb_id", detail.id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabaseAdmin
            .from("spanish_films")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabaseAdmin.from("spanish_films").insert(payload);
          if (error) throw error;
          imported++;
        }
      }

      if (page >= list.total_pages) break;
    }

    return { imported, updated, needsReview, year: data.year };
  });

/** Actualiza campos editables manualmente. */
export const updateSpanishFilm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        composer: z.string().nullable().optional(),
        music_supervisor: z.string().nullable().optional(),
        platform: z.string().nullable().optional(),
        needs_review: z.boolean().optional(),
        review_reason: z.string().nullable().optional(),
        composer_person_id: z.string().uuid().nullable().optional(),
        music_supervisor_person_id: z.string().uuid().nullable().optional(),
        directors: z.array(z.string()).optional(),
        director_ids: z.array(z.string().uuid()).optional(),
        production_companies: z.array(z.string()).optional(),
        production_company_ids: z.array(z.string().uuid()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await adminCheck(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("spanish_films").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });