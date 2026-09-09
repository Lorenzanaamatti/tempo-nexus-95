import { supabase } from "@/integrations/supabase/client";
import { normalizeTitle, type ParsedOpportunity } from "@/lib/opportunity-production";

/** Busca una productora por nombre en el CRM; si no existe, la crea con el nombre. */
export async function findOrCreateCompany(name: string): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: found } = await supabase
    .from("production_companies")
    .select("id, name")
    .ilike("name", clean)
    .limit(1);
  if (found && found.length) return found[0].id;
  const { data, error } = await supabase.from("production_companies").insert({ name: clean }).select("id").single();
  if (error) throw error;
  return data.id;
}

/** Busca un director por nombre en el CRM; si no existe, lo crea con el nombre. */
export async function findOrCreateDirector(name: string): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: found } = await supabase
    .from("directors")
    .select("id, full_name")
    .ilike("full_name", clean)
    .limit(1);
  if (found && found.length) return found[0].id;
  const { data, error } = await supabase.from("directors").insert({ full_name: clean }).select("id").single();
  if (error) throw error;
  return data.id;
}

export type IntakeOutcome = { title: string; action: "creada" | "actualizada" | "error"; message?: string; id?: string };

/** Alta o actualización (dedupe por título + director) de una oportunidad de producción. */
export async function upsertProductionOpportunity(row: ParsedOpportunity): Promise<IntakeOutcome> {
  try {
    const companyId = row.productoraName ? await findOrCreateCompany(row.productoraName) : null;
    const directorId = row.directorName ? await findOrCreateDirector(row.directorName) : null;

    const payload: Record<string, unknown> = {
      title: row.title.trim(),
      kind: "pitch",
      titulo_alt: row.titulo_alt,
      tipo_produccion: row.tipo_produccion,
      genero_produccion: row.genero_produccion,
      paises: row.paises,
      presupuesto_min: row.presupuesto_min,
      presupuesto_max: row.presupuesto_max,
      presupuesto_texto: row.presupuesto_texto,
      financiacion_publica: row.financiacion_publica,
      fase: row.fase,
      fecha_rodaje: row.fecha_rodaje,
      fecha_estreno: row.fecha_estreno,
      partner_company_id: companyId,
      partner_name: companyId ? null : row.productoraName,
      productora_aie: row.productora_aie,
      director_id: directorId,
      director_text: directorId ? null : row.directorName,
      reparto: row.reparto,
      fuente_url: row.fuente_url,
      detected_date: row.detected_date,
      origen: row.origen,
      notes: row.notes,
      prioridad: row.prioridad,
      target_production_text: row.title.trim(),
    };

    // Dedupe: mismo título normalizado + mismo director.
    const { data: candidates } = await supabase
      .from("opportunities")
      .select("id, title, director_id, director_text, notes")
      .ilike("title", row.title.trim());
    const match = (candidates ?? []).find(
      (c: any) =>
        normalizeTitle(c.title) === normalizeTitle(row.title) &&
        (directorId
          ? c.director_id === directorId
          : normalizeTitle(c.director_text ?? "") === normalizeTitle(row.directorName ?? "")),
    );

    if (match) {
      const cleaned = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length)),
      );
      const { error } = await supabase
        .from("opportunities")
        .update(cleaned as never)
        .eq("id", (match as any).id);
      if (error) throw error;
      return { title: row.title, action: "actualizada", id: (match as any).id };
    }

    const { data, error } = await supabase
      .from("opportunities")
      .insert({ ...payload, statuses: ["identificado"] } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { title: row.title, action: "creada", id: (data as any).id };
  } catch (e: any) {
    return { title: row.title, action: "error", message: e?.message ?? "Error desconocido" };
  }
}
