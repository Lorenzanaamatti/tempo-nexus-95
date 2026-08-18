import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

/** Busca por nombre exacto (sin distinguir mayúsculas) para no duplicar fichas. */
async function existsByName(table: string, column: string, value: string) {
  const { data } = await db.from(table).select("id").ilike(column, value.trim()).limit(1).maybeSingle();
  return (data as any)?.id as string | undefined;
}

async function ensure(table: string, column: string, value: string, payload: Record<string, unknown>) {
  const found = await existsByName(table, column, value);
  if (found) return { id: found, created: false };
  const { data, error } = await db.from(table).insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: (data as any).id as string, created: true };
}

/** Alta directa de una productora en Partners y en el catálogo de productoras. */
export async function addProductora(nombre: string) {
  const r = await ensure("partners", "nombre", nombre, { nombre: nombre.trim(), tipo: "Productora" });
  await ensure("production_companies", "name", nombre, { name: nombre.trim() });
  toast[r.created ? "success" : "info"](r.created ? `«${nombre}» añadida a Partners · Productoras` : `«${nombre}» ya estaba en Partners`);
}

/** Alta directa de una plataforma en Partners y en el catálogo de plataformas. */
export async function addPlataforma(nombre: string) {
  const r = await ensure("partners", "nombre", nombre, { nombre: nombre.trim(), tipo: "Plataforma" });
  await ensure("platforms", "name", nombre, { name: nombre.trim() });
  toast[r.created ? "success" : "info"](r.created ? `«${nombre}» añadida a Partners · Plataformas` : `«${nombre}» ya estaba en Partners`);
}

/** Alta directa de un director o directora en el CRM de direcciones. */
export async function addDirector(nombre: string) {
  const r = await ensure("directors", "full_name", nombre, { full_name: nombre.trim() });
  toast[r.created ? "success" : "info"](r.created ? `«${nombre}» añadido a Directores` : `«${nombre}» ya estaba en Directores`);
}

/** Alta directa como cuenta objetivo comercial. */
export async function addCuentaObjetivo(nombre: string, accountType: "productora" | "plataforma" = "productora", notes?: string) {
  const r = await ensure("target_accounts", "name", nombre, {
    name: nombre.trim(),
    account_type: accountType,
    notes: notes ?? null,
  });
  toast[r.created ? "success" : "info"](r.created ? `«${nombre}» añadida a Cuentas objetivo` : `«${nombre}» ya estaba en Cuentas objetivo`);
}

/** Alta directa como prospect de fichaje del roster. */
export async function addProspectFichaje(nombre: string, notas?: string) {
  const r = await ensure("roster_prospects", "nombre", nombre, { nombre: nombre.trim(), notas: notas ?? null });
  toast[r.created ? "success" : "info"](r.created ? `«${nombre}» añadido a Prospects de fichaje` : `«${nombre}» ya estaba en Prospects`);
}
