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
