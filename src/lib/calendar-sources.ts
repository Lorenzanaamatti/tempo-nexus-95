// Extra "virtual" event kinds derived from other tables (not stored in DB enum).
// These appear in the global calendar alongside the real availability_kind events.

export const EXTRA_KIND_LABELS = {
  oportunidad_detectada: "Oportunidad detectada",
  oportunidad_contacto: "Último contacto",
  oportunidad_cierre: "Cierre estimado",
  contrato_firma: "Firma de contrato",
  contrato_fin: "Fin de contrato",
  contrato_preaviso: "Preaviso contrato",
  tarea: "Tarea / acción",
  estreno: "Estreno",
  entrega: "Entrega",
} as const;

export type ExtraKind = keyof typeof EXTRA_KIND_LABELS;

export type CalendarSource =
  | "people"
  | "productions"
  | "billing"
  | "opportunities"
  | "contracts"
  | "tasks";

export const CALENDAR_SOURCE_LABELS: Record<CalendarSource, string> = {
  people: "Equipo & Roster",
  productions: "Producciones",
  billing: "Facturación",
  opportunities: "Oportunidades",
  contracts: "Contratos",
  tasks: "Tareas",
};

// One signature color per source family. Used for the chip dot and for all
// timeline bars of events that belong to that family. Subtypes inside a
// family only vary in intensity, never in hue.
export const FAMILY_DOT: Record<CalendarSource, string> = {
  people: "bg-emerald-500",
  productions: "bg-violet-500",
  billing: "bg-amber-500",
  opportunities: "bg-sky-500",
  contracts: "bg-orange-500",
  tasks: "bg-zinc-500",
};

// Maps every kind (availability + extra) to its source family.
export const KIND_FAMILY: Record<string, CalendarSource> = {
  libre: "people",
  ocupado: "people",
  vacaciones: "people",
  personal: "people",
  produccion: "productions",
  estreno: "productions",
  entrega: "productions",
  facturacion: "billing",
  pago: "billing",
  cobro: "billing",
  oportunidad_detectada: "opportunities",
  oportunidad_contacto: "opportunities",
  oportunidad_cierre: "opportunities",
  contrato_firma: "contracts",
  contrato_preaviso: "contracts",
  contrato_fin: "contracts",
  tarea: "tasks",
};

// Bar styles per kind. Same hue inside a family, intensity varies per subtype.
export const KIND_BAR_ALL: Record<string, string> = {
  // people — emerald
  libre: "bg-emerald-400/70 border-emerald-600/40 text-emerald-950",
  ocupado: "bg-emerald-700/85 border-emerald-900/50 text-emerald-50",
  vacaciones: "bg-emerald-500/75 border-emerald-700/40 text-emerald-50",
  personal: "bg-emerald-300/70 border-emerald-500/40 text-emerald-950",
  // productions — violet
  produccion: "bg-violet-500/75 border-violet-700/50 text-violet-50",
  estreno: "bg-violet-700/90 border-violet-900/50 text-violet-50",
  entrega: "bg-violet-300/80 border-violet-500/40 text-violet-950",
  // billing — amber
  facturacion: "bg-amber-400/80 border-amber-600/50 text-amber-950",
  pago: "bg-amber-600/85 border-amber-800/50 text-amber-50",
  cobro: "bg-amber-800/90 border-amber-950/50 text-amber-50",
  // opportunities — sky
  oportunidad_detectada: "bg-sky-300/75 border-sky-500/40 text-sky-950",
  oportunidad_contacto: "bg-sky-500/80 border-sky-700/50 text-sky-50",
  oportunidad_cierre: "bg-sky-700/90 border-sky-900/50 text-sky-50",
  // contracts — orange
  contrato_preaviso: "bg-orange-300/80 border-orange-500/40 text-orange-950",
  contrato_firma: "bg-orange-600/90 border-orange-800/50 text-orange-50",
  contrato_fin: "bg-orange-400/80 border-orange-600/50 text-orange-950",
  // tasks — zinc
  tarea: "bg-zinc-600/85 border-zinc-800/50 text-zinc-50",
};