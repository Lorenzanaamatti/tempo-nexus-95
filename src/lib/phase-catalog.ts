import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type PhaseCatalogItem = {
  id: string;
  name: string;
  requires_detail: boolean;
  requires_place: boolean;
  allows_multiple: boolean;
  is_premiere: boolean;
  default_owner: string;
  position: number;
};

export const PHASE_CATALOG_KEY = ["phase-catalog"];

export function usePhaseCatalog() {
  return useQuery({
    queryKey: PHASE_CATALOG_KEY,
    queryFn: async () => {
      const { data, error } = await db
        .from("phase_catalog")
        .select("id, name, requires_detail, requires_place, allows_multiple, is_premiere, default_owner, position")
        .order("position", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PhaseCatalogItem[];
    },
  });
}

export function useInvalidatePhaseCatalog() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: PHASE_CATALOG_KEY });
}

/** Añade un proceso escrito a mano a la lista estándar. */
export async function addToPhaseCatalog(input: {
  name: string;
  requires_detail?: boolean;
  requires_place?: boolean;
  allows_multiple?: boolean;
  is_premiere?: boolean;
  default_owner?: string;
}) {
  const { data, error } = await db
    .from("phase_catalog")
    .insert({
      name: input.name.trim(),
      requires_detail: !!input.requires_detail,
      requires_place: !!input.requires_place,
      allows_multiple: input.allows_multiple ?? true,
      is_premiere: !!input.is_premiere,
      default_owner: input.default_owner ?? "representado",
      position: 900,
    })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data?.id as string | undefined;
}

export function findCatalogByName(list: PhaseCatalogItem[] | undefined, name: string) {
  const n = name.trim().toLowerCase();
  return (list ?? []).find((c) => c.name.trim().toLowerCase() === n);
}
