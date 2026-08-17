import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProduccionEspanola } from "@/lib/producciones-espanolas";

const db = supabase as any;

/** Crea (o reutiliza) un expediente interno en Producciones a partir de una ficha de mercado. */
export async function addEspanolaToProducciones(row: ProduccionEspanola) {
  const title = row.title_es ?? row.title;
  const { data: existing } = await db
    .from("productions")
    .select("id")
    .ilike("title", title)
    .maybeSingle();

  let productionId: string | null = existing?.id ?? null;
  if (!productionId) {
    const { data, error } = await db
      .from("productions")
      .insert({
        title,
        year: row.year,
        kind: row.media_type === "tv" ? "serie" : "cine",
        is_historical: true,
        notes: `Importada desde Producciones españolas (TMDb ${row.tmdb_id ?? "—"})`,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    productionId = data.id as string;
    toast.success(`"${title}" creada en Producciones`);
  } else {
    toast.info(`"${title}" ya existía en Producciones`);
  }

  await db
    .from("producciones_espanolas")
    .update({ produccion_ic_vinculada: productionId, ic_participo: true })
    .eq("id", row.id);
  return productionId;
}

/** Añade una persona al embudo de fichajes (Oportunidades › Prospects de fichaje). */
export async function addProspectFichaje(nombre: string, notas?: string | null, rol?: string | null) {
  const n = nombre.trim();
  if (!n) return null;
  const { data: existing } = await db
    .from("roster_prospects")
    .select("id")
    .ilike("nombre", n)
    .maybeSingle();
  if (existing) {
    toast.info(`"${n}" ya está en Prospects de fichaje`);
    return existing.id as string;
  }
  const { data, error } = await db
    .from("roster_prospects")
    .insert({
      nombre: n,
      fecha_primer_contacto: new Date().toISOString().slice(0, 10),
      estado: "contactado",
      notas: notas ?? null,
      rol: rol ?? null,
    })
    .select("id")
    .single();
  if (error) {
    toast.error(error.message);
    return null;
  }
  toast.success(`"${n}" añadido a Prospects de fichaje`);
  return data.id as string;
}

/** Crea (o reutiliza) un partner del CRM unificado. */
export async function addPartner(nombre: string, tipo: "Productora" | "Medio" | "Institución") {
  const n = nombre.trim();
  if (!n) return null;
  const { data: existing } = await db.from("partners").select("id").ilike("nombre", n).maybeSingle();
  if (existing) {
    toast.info(`"${n}" ya está en Partners`);
    return existing.id as string;
  }
  const { data, error } = await db
    .from("partners")
    .insert({ nombre: n, tipo, tipo_apoyo: [] })
    .select("id")
    .single();
  if (error) {
    toast.error(error.message);
    return null;
  }
  toast.success(`"${n}" añadido a Partners (${tipo})`);
  return data.id as string;
}
