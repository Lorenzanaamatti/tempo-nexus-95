/**
 * Estados de representación unificados para todo el roster.
 * Nomenclatura única: Contratado · En prospección · En negociación · En objetivos.
 */
export const REPRESENTATION_STATUS_OPTIONS = [
  { value: "activo", label: "Contratado" },
  { value: "prospeccion", label: "En prospección" },
  { value: "en_negociacion", label: "En negociación" },
  { value: "objetivo", label: "En objetivos" },
] as const;

export type RepresentationStatusValue =
  (typeof REPRESENTATION_STATUS_OPTIONS)[number]["value"];

export const REPRESENTATION_STATUS_LABELS: Record<string, string> = {
  activo: "Contratado",
  prospeccion: "En prospección",
  en_negociacion: "En negociación",
  objetivo: "En objetivos",
  pausa: "En pausa",
  finalizado: "Finalizado",
};

export const REPRESENTATION_STATUS_TONE: Record<string, string> = {
  activo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  prospeccion: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
  en_negociacion: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25",
  objetivo: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25",
  pausa: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25",
  finalizado: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25",
};

export function representationStatusLabel(v: string | null | undefined) {
  return REPRESENTATION_STATUS_LABELS[v ?? "activo"] ?? "—";
}
