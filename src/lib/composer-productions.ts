import { supabase } from "@/integrations/supabase/client";

/** Producciones reales de un artista: como titular o asignado (production_assignments). Fuente única para el portal. */
export async function fetchComposerProductions<T = Record<string, unknown>>(composerId: string, select: string): Promise<T[]> {
  const { data: asg } = await supabase.from("production_assignments").select("production_id").eq("composer_id", composerId);
  const ids = [...new Set((asg ?? []).map((r) => r.production_id))];
  const or = ids.length ? `composer_id.eq.${composerId},id.in.(${ids.join(",")})` : `composer_id.eq.${composerId}`;
  const { data, error } = await supabase.from("productions").select(select).or(or);
  if (error) throw error;
  return (data ?? []) as T[];
}

/** Año de trabajo de una producción para KPIs: inicio real (start_date), si falta el campo «año» (suele ser estreno) y si no, la fecha de alta. */
export function productionWorkYear(p: { start_date?: string | null; year?: number | null; created_at?: string | null }): number {
  if (p.start_date) return Number(p.start_date.slice(0, 4));
  if (p.year) return p.year;
  return Number(String(p.created_at ?? new Date().toISOString()).slice(0, 4));
}
