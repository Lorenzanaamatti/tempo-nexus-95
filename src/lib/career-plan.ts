import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CareerMetric =
  | "pitches"
  | "facturacion"
  | "tracks_publicados"
  | "premios_nominaciones"
  | "proyectos_internacionales"
  | "cobertura_prensa"
  | "sincronizaciones";

export const CAREER_METRICS: { key: CareerMetric; label: string; auto: boolean; money?: boolean }[] = [
  { key: "pitches", label: "Pitches", auto: true },
  { key: "facturacion", label: "Facturación (€)", auto: true, money: true },
  { key: "tracks_publicados", label: "Tracks publicados", auto: false },
  { key: "premios_nominaciones", label: "Premios y nominaciones", auto: false },
  { key: "proyectos_internacionales", label: "Proyectos internacionales", auto: false },
  { key: "cobertura_prensa", label: "Cobertura de prensa", auto: true },
  { key: "sincronizaciones", label: "Sincronizaciones / placements", auto: true },
];

export const SOCIAL_NETWORKS = ["Spotify", "LinkedIn", "Instagram", "Facebook", "TikTok", "YouTube"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export const ACTION_TYPES = [
  "Pitch",
  "Reunión con productor",
  "Festival",
  "Evento",
  "Formación",
  "Lanzamiento de música",
  "Campaña de marketing",
  "Construcción de identidad",
  "Otro",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const LINK_TYPES = ["Ninguno", "Producción", "Oportunidad", "Tarea"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const PLATFORM_STATUS = ["Actualizado", "Desactualizado", "Sin perfil"] as const;
export type PlatformStatus = (typeof PLATFORM_STATUS)[number];

export const PLATFORM_STATUS_CLASS: Record<PlatformStatus, string> = {
  Actualizado: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Desactualizado: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Sin perfil": "bg-muted text-muted-foreground",
};

export const PLAN_YEARS = (base = new Date().getFullYear()) => [base, base + 1, base + 2];

export type CareerPlan = {
  id: string;
  representado_id: string;
  objetivo_posicionamiento: string | null;
  objetivo_presentacion_clientes: string | null;
  objetivo_facturacion_3y: number | null;
  notas_generales: string | null;
};

/** Carga (y crea si falta, cuando hay permisos) el plan de carrera del representado. */
export function useCareerPlan(composerId: string | null | undefined, canEdit: boolean) {
  return useQuery({
    queryKey: ["career-plan", composerId],
    enabled: !!composerId,
    queryFn: async (): Promise<CareerPlan | null> => {
      const { data } = await supabase
        .from("career_plans")
        .select("id, representado_id, objetivo_posicionamiento, objetivo_presentacion_clientes, objetivo_facturacion_3y, notas_generales")
        .eq("representado_id", composerId!)
        .maybeSingle();
      if (data) return data as CareerPlan;
      if (!canEdit) return null;
      const { data: created } = await supabase
        .from("career_plans")
        .insert({ representado_id: composerId! })
        .select("id, representado_id, objetivo_posicionamiento, objetivo_presentacion_clientes, objetivo_facturacion_3y, notas_generales")
        .maybeSingle();
      return (created as CareerPlan) ?? null;
    },
  });
}

export function useCareerPlanRows(planId: string | null | undefined) {
  return useQuery({
    queryKey: ["career-plan-rows", planId],
    enabled: !!planId,
    queryFn: async () => {
      const [targets, social, custom, actions] = await Promise.all([
        supabase.from("career_plan_targets").select("*").eq("career_plan_id", planId!),
        supabase.from("career_plan_social").select("*").eq("career_plan_id", planId!),
        supabase.from("career_plan_social_custom").select("*").eq("career_plan_id", planId!),
        supabase.from("career_plan_actions").select("*").eq("career_plan_id", planId!).order("fecha", { ascending: false }),
      ]);
      return {
        targets: targets.data ?? [],
        social: social.data ?? [],
        custom: custom.data ?? [],
        actions: actions.data ?? [],
      };
    },
  });
}

/** Métricas auto-calculadas del año en curso para el representado. */
export function useCareerActuals(composerId: string | null | undefined, planId: string | null | undefined, year: number) {
  return useQuery({
    queryKey: ["career-actuals", composerId, planId, year],
    enabled: !!composerId,
    queryFn: async () => {
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;
      const [prods, clips, pitches] = await Promise.all([
        supabase.from("productions").select("id, title, status, year, fee_amount, estimated_delivery_date, kind").eq("composer_id", composerId!),
        supabase.from("press_clippings").select("id, published_date").eq("composer_id", composerId!).gte("published_date", from).lte("published_date", to),
        planId
          ? supabase.from("career_plan_actions").select("id, resultado, fecha").eq("career_plan_id", planId).eq("tipo", "Pitch").gte("fecha", from).lte("fecha", to)
          : Promise.resolve({ data: [] as { id: string; resultado: string | null; fecha: string }[] }),
      ]);
      const productions = (prods.data ?? []) as any[];
      const yearProds = productions.filter((p) => p.year === year);
      return {
        productions,
        facturacion: yearProds.reduce((s, p) => s + Number(p.fee_amount ?? 0), 0),
        sincronizaciones: yearProds.length,
        cobertura_prensa: (clips.data ?? []).length,
        pitches: (pitches.data ?? []).length,
        pitchRows: (pitches.data ?? []) as { id: string; resultado: string | null; fecha: string }[],
      };
    },
  });
}

export function usePlatforms(composerId: string | null | undefined) {
  return useQuery({
    queryKey: ["representado-plataformas", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const [base, custom] = await Promise.all([
        supabase.from("representado_plataformas").select("*").eq("representado_id", composerId!),
        supabase.from("representado_plataformas_custom").select("*").eq("representado_id", composerId!),
      ]);
      return { base: base.data ?? [], custom: custom.data ?? [] };
    },
  });
}

export function useInvalidateCareerPlan() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["career-plan-rows"] });
    qc.invalidateQueries({ queryKey: ["career-plan"] });
    qc.invalidateQueries({ queryKey: ["career-actuals"] });
    qc.invalidateQueries({ queryKey: ["representado-plataformas"] });
  };
}
