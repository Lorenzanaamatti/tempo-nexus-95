import { supabase } from "@/integrations/supabase/client";

export type PhaseTemplateItem = {
  name: string;
  owner: "agencia" | "representado" | "productora";
  milestone?: boolean;
};

export type PhaseTemplateKey = "largometraje" | "serie" | "documental" | "publicidad";

export const PHASE_TEMPLATE_LABEL: Record<PhaseTemplateKey, string> = {
  largometraje: "Largometraje",
  serie: "Serie",
  documental: "Documental",
  publicidad: "Publicidad / encargo corto",
};

const COMMON_END: PhaseTemplateItem[] = [
  { name: "Período de mezclas", owner: "representado" },
  { name: "Máster y entrega final", owner: "representado", milestone: true },
  { name: "Cue sheet y documentación", owner: "agencia", milestone: true },
];

export const PHASE_TEMPLATES: Record<PhaseTemplateKey, PhaseTemplateItem[]> = {
  largometraje: [
    { name: "Entrega del plocked", owner: "productora", milestone: true },
    { name: "Spotting con dirección", owner: "agencia" },
    { name: "Inicio de la composición", owner: "representado", milestone: true },
    { name: "Aprobación de las obras musicales", owner: "productora", milestone: true },
    { name: "Período de grabación", owner: "representado" },
    { name: "Entrega bobina 1", owner: "representado", milestone: true },
    { name: "Entrega bobina 2", owner: "representado", milestone: true },
    { name: "Entrega bobina 3", owner: "representado", milestone: true },
    { name: "Entrega bobina 4", owner: "representado", milestone: true },
    { name: "Entrega bobina 5", owner: "representado", milestone: true },
    ...COMMON_END,
  ],
  serie: [
    { name: "Entrega del plocked", owner: "productora", milestone: true },
    { name: "Spotting de temporada", owner: "agencia" },
    { name: "Inicio de la composición", owner: "representado", milestone: true },
    { name: "Aprobación del tema principal", owner: "productora", milestone: true },
    { name: "Composición episodios 1-4", owner: "representado" },
    { name: "Composición episodios 5-8", owner: "representado" },
    { name: "Período de grabación", owner: "representado" },
    { name: "Entrega por episodios", owner: "representado" },
    ...COMMON_END,
  ],
  documental: [
    { name: "Entrega del montaje / plocked", owner: "productora", milestone: true },
    { name: "Inicio de la composición", owner: "representado", milestone: true },
    { name: "Aprobación de las obras musicales", owner: "productora", milestone: true },
    { name: "Período de grabación", owner: "representado" },
    ...COMMON_END,
  ],
  publicidad: [
    { name: "Briefing y referencias", owner: "productora", milestone: true },
    { name: "Demo / propuesta", owner: "representado", milestone: true },
    { name: "Aprobación del cliente", owner: "productora", milestone: true },
    { name: "Grabación y mezcla", owner: "representado" },
    { name: "Entrega final", owner: "representado", milestone: true },
  ],
};

/** Mapea el tipo de producción de la app a la plantilla de procesos por defecto. */
export function templateForKind(kind?: string | null): PhaseTemplateKey {
  switch (kind) {
    case "serie":
    case "programa_tv":
      return "serie";
    case "documental":
      return "documental";
    case "publicidad":
      return "publicidad";
    default:
      return "largometraje";
  }
}

/**
 * Crea los procesos de la plantilla (sin fechas: la agente las completa a mano).
 * No duplica procesos ya existentes con el mismo nombre.
 */
export async function seedProductionPhases(productionId: string, key: PhaseTemplateKey) {
  const db = supabase as any;
  const { data: existing } = await db
    .from("production_phases")
    .select("name, position")
    .eq("production_id", productionId);
  const taken = new Set(((existing ?? []) as any[]).map((r) => String(r.name).trim().toLowerCase()));
  let position = ((existing ?? []) as any[]).length;

  const rows = PHASE_TEMPLATES[key]
    .filter((t) => !taken.has(t.name.toLowerCase()))
    .map((t) => ({
      production_id: productionId,
      name: t.name,
      owner: t.owner,
      is_milestone: !!t.milestone,
      template_key: key,
      status: "pendiente",
      position: position++,
    }));

  if (!rows.length) return { inserted: 0 };
  const { error } = await db.from("production_phases").insert(rows);
  if (error) throw error;
  return { inserted: rows.length };
}
