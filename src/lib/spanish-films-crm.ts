import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ExportField } from "@/components/export-button";

export type Film = {
  id: string;
  tmdb_id: number;
  year: number;
  title: string;
  title_es: string | null;
  original_title: string | null;
  directors: string[];
  production_companies: string[];
  composer: string | null;
  music_supervisor: string | null;
  platform: string | null;
  box_office_eur: number | null;
  needs_review: boolean;
  review_reason: string | null;
  completeness: number;
  poster_path: string | null;
  director_ids: string[] | null;
  production_company_ids: string[] | null;
  composer_person_id: string | null;
  music_supervisor_person_id: string | null;
};

export type RosterDirector = { id: string; full_name: string };
export type RosterCompany = { id: string; name: string };
export type RosterComposer = { id: string; full_name: string; artistic_name: string | null };
export type RosterPerson = { id: string; full_name: string; role: string };

export const FILM_SELECT =
  "id, tmdb_id, year, title, title_es, original_title, directors, production_companies, composer, music_supervisor, platform, box_office_eur, needs_review, review_reason, completeness, poster_path, director_ids, production_company_ids, composer_person_id, music_supervisor_person_id";

export function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `roster-${Date.now()}`
  );
}


/** Distancia de edición normalizada (0-1) para detectar nombres casi idénticos. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  const prev = new Array(n + 1).fill(0).map((_, j) => j);
  const cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return 1 - prev[n] / Math.max(m, n);
}

/**
 * Busca fichas con nombre casi idéntico (errores de tecleo, tildes, orden distinto)
 * para evitar duplicados al crear desde CRM Películas.
 */
export async function findNearDuplicate(
  table: "directors" | "production_companies" | "people" | "target_accounts",
  column: "full_name" | "name",
  value: string,
  threshold = 0.86,
): Promise<{ id: string; name: string } | null> {
  const n = normalizeName(value);
  if (n.length < 3) return null;
  const token = n.split(" ")[0]!;
  const { data } = await supabase
    .from(table)
    .select(`id, ${column}`)
    .ilike(column, `%${token}%`)
    .limit(25);
  for (const row of (data ?? []) as any[]) {
    const candidate = normalizeName(row[column]);
    if (candidate === n) return { id: row.id, name: row[column] };
    if (similarity(candidate, n) >= threshold) return { id: row.id, name: row[column] };
  }
  return null;
}

export async function addToTargetAccounts(params: {
  name: string;
  account_type: "roster" | "productora" | "plataforma" | "otros";
  roster_kind?: "composer" | "artista" | "productor_musical" | "otros" | null;
  production_company_id?: string | null;
}) {
  const name = params.name.trim();
  if (!name) return toast.error("Nombre vacío");
  const { data: existing } = await supabase
    .from("target_accounts")
    .select("id")
    .ilike("name", name)
    .eq("account_type", params.account_type)
    .maybeSingle();
  if (existing) {
    toast.info(`"${name}" ya está en Cuentas Objetivo`);
    return;
  }
  const near = await findNearDuplicate("target_accounts", "name", name);
  if (near) {
    toast.warning(`Posible duplicado: "${near.name}" ya está en Cuentas Objetivo`);
    return;
  }
  const { error } = await supabase.from("target_accounts").insert({
    name,
    account_type: params.account_type,
    roster_kind: params.roster_kind ?? null,
    production_company_id: params.production_company_id ?? null,
  } as any);
  if (error) return toast.error(error.message);
  toast.success(`Añadido a Cuentas Objetivo: ${name}`);
}

export async function addDirectorToCrm(name: string) {
  const n = name.trim();
  if (!n) return null;
  const { data: existing } = await supabase
    .from("directors")
    .select("id")
    .ilike("full_name", n)
    .maybeSingle();
  if (existing) {
    toast.info(`"${n}" ya existe en Directores`);
    return existing.id;
  }
  const near = await findNearDuplicate("directors", "full_name", n);
  if (near) {
    toast.warning(`Posible duplicado: ya existe "${near.name}" en Directores`);
    return near.id;
  }
  const { data, error } = await supabase.from("directors").insert({ full_name: n }).select("id").single();
  if (error) {
    toast.error(error.message);
    return null;
  }
  toast.success(`Creado en Directores CRM: ${n}`);
  return data.id;
}

export async function addCompanyToCrm(name: string) {
  const n = name.trim();
  if (!n) return null;
  const { data: existing } = await supabase
    .from("production_companies")
    .select("id")
    .ilike("name", n)
    .maybeSingle();
  if (existing) {
    toast.info(`"${n}" ya existe en Productoras`);
    return existing.id;
  }
  const near = await findNearDuplicate("production_companies", "name", n);
  if (near) {
    toast.warning(`Posible duplicado: ya existe "${near.name}" en Productoras`);
    return near.id;
  }
  const { data, error } = await supabase.from("production_companies").insert({ name: n }).select("id").single();
  if (error) {
    toast.error(error.message);
    return null;
  }
  toast.success(`Creado en Productoras CRM: ${n}`);
  return data.id;
}

export async function addPlatformToCrm(name: string) {
  const n = name.trim();
  if (!n) return null;
  const { data: existing } = await supabase
    .from("platforms")
    .select("id")
    .ilike("name", n)
    .maybeSingle();
  if (existing) {
    toast.info(`"${n}" ya existe en Plataformas`);
    return existing.id;
  }
  const { data, error } = await supabase.from("platforms").insert({ name: n }).select("id").single();
  if (error) {
    toast.error(error.message);
    return null;
  }
  toast.success(`Creado en Plataformas CRM: ${n}`);
  return data.id;
}

export async function addToRoster(name: string, roster_role: "composer" | "supervisor") {
  const n = name.trim();
  if (!n) return null;
  const { data: existing } = await supabase
    .from("composers")
    .select("id")
    .ilike("full_name", n)
    .maybeSingle();
  if (existing) {
    toast.info(`"${n}" ya existe en Roster`);
    return existing.id;
  }
  const { data, error } = await supabase
    .from("composers")
    .insert({ full_name: n, slug: slugify(n), roster_role } as any)
    .select("id")
    .single();
  if (error) {
    toast.error(error.message);
    return null;
  }
  toast.success(`Añadido al Roster: ${n}`);
  return data.id;
}

export function filmExportFields(): ExportField<Film>[] {
  return [
    { key: "year", label: "Año", get: (r) => r.year },
    { key: "title", label: "Título", get: (r) => r.title },
    { key: "directors", label: "Director", expandArray: true, get: (r) => r.directors },
    { key: "production_companies", label: "Productora", expandArray: true, get: (r) => r.production_companies },
    { key: "composer", label: "Compositor BSO", get: (r) => r.composer },
    { key: "music_supervisor", label: "Supervisor musical", get: (r) => r.music_supervisor },
    { key: "platform", label: "Plataforma", get: (r) => r.platform },
    { key: "box_office_eur", label: "Recaudación (€)", get: (r) => r.box_office_eur },
    { key: "completeness", label: "Completitud (0-7)", get: (r) => r.completeness },
    { key: "needs_review", label: "Necesita revisión", default: false, get: (r) => r.needs_review },
    { key: "review_reason", label: "Motivo revisión", default: false, get: (r) => r.review_reason },
    { key: "tmdb_id", label: "TMDb ID", default: false, get: (r) => r.tmdb_id },
  ];
}
