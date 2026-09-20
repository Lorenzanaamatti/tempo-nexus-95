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
  color_key: PhaseColorKey;
};

export const PHASE_COLOR_KEYS = [
  "aubergine", "rust", "avocado", "berry", "coral", "mustard",
  "teal", "forest", "denim", "plum", "rose", "graphite",
] as const;

export type PhaseColorKey = (typeof PHASE_COLOR_KEYS)[number];

export const PHASE_COLOR_LABEL: Record<PhaseColorKey, string> = {
  aubergine: "Aubergine", rust: "Óxido", avocado: "Aguacate", berry: "Baya",
  coral: "Coral", mustard: "Mostaza", teal: "Verde azulado", forest: "Bosque",
  denim: "Denim", plum: "Ciruela", rose: "Rosa", graphite: "Grafito",
};

export const PHASE_COLOR_CLASS: Record<PhaseColorKey, string> = {
  aubergine: "bg-phase-aubergine", rust: "bg-phase-rust", avocado: "bg-phase-avocado",
  berry: "bg-phase-berry", coral: "bg-phase-coral", mustard: "bg-phase-mustard",
  teal: "bg-phase-teal", forest: "bg-phase-forest", denim: "bg-phase-denim",
  plum: "bg-phase-plum", rose: "bg-phase-rose", graphite: "bg-phase-graphite",
};

export const PHASE_CATALOG_KEY = ["phase-catalog"];

export function usePhaseCatalog() {
  return useQuery({
    queryKey: PHASE_CATALOG_KEY,
    queryFn: async () => {
      const { data, error } = await db
        .from("phase_catalog")
        .select("id, name, requires_detail, requires_place, allows_multiple, is_premiere, default_owner, position, color_key")
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
  color_key: PhaseColorKey;
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
      color_key: input.color_key,
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
