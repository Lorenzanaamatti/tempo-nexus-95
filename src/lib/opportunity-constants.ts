export const OPPORTUNITY_STATUS_LABEL = {
  identificado: "Identificado",
  primer_contacto: "Primer contacto",
  propuesta_enviada: "Propuesta enviada",
  negociacion: "Negociación",
  cerrado: "Cerrado",
  descartado: "Descartado",
} as const;

export type OpportunityStatus = keyof typeof OPPORTUNITY_STATUS_LABEL;

export const OPPORTUNITY_STATUS_TONE: Record<OpportunityStatus, string> = {
  identificado: "bg-muted text-foreground",
  primer_contacto: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  propuesta_enviada: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  negociacion: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  cerrado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  descartado: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export const OPPORTUNITY_KIND_LABEL = {
  fichaje: "Fichaje de representado",
  pitch: "Presentar representado a producción",
  presentar_ic: "Presentar IC a productora",
  fichaje_productora: "Fichaje de productora",
} as const;

export type OpportunityKind = keyof typeof OPPORTUNITY_KIND_LABEL;

export const OPPORTUNITY_KIND_TONE: Record<OpportunityKind, string> = {
  fichaje: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  pitch: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  presentar_ic: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  fichaje_productora: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
};