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

export const EXTRA_KIND_BAR: Record<ExtraKind, string> = {
  oportunidad_detectada: "bg-cyan-500/70 border-cyan-700/40 text-cyan-50",
  oportunidad_contacto: "bg-blue-500/70 border-blue-700/40 text-blue-50",
  oportunidad_cierre: "bg-fuchsia-500/75 border-fuchsia-700/40 text-fuchsia-50",
  contrato_firma: "bg-teal-600/80 border-teal-800/50 text-teal-50",
  contrato_fin: "bg-zinc-500/75 border-zinc-700/40 text-zinc-50",
  contrato_preaviso: "bg-orange-500/80 border-orange-700/40 text-orange-50",
  tarea: "bg-yellow-500/80 border-yellow-700/40 text-yellow-900",
  estreno: "bg-pink-500/80 border-pink-700/40 text-pink-50",
  entrega: "bg-lime-500/80 border-lime-700/40 text-lime-900",
};

export const EXTRA_KIND_CHIP: Record<ExtraKind, string> = {
  oportunidad_detectada: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40",
  oportunidad_contacto: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40",
  oportunidad_cierre: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/40",
  contrato_firma: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40",
  contrato_fin: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/40",
  contrato_preaviso: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40",
  tarea: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/40",
  estreno: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/40",
  entrega: "bg-lime-500/15 text-lime-800 dark:text-lime-300 border-lime-500/40",
};

export type CalendarSource =
  | "people"
  | "productions"
  | "billing"
  | "opportunities"
  | "contracts"
  | "tasks";

export const CALENDAR_SOURCE_LABELS: Record<CalendarSource, string> = {
  people: "Equipo y roster",
  productions: "Producciones",
  billing: "Facturación / pagos / cobros",
  opportunities: "Oportunidades (CRM)",
  contracts: "Contratos",
  tasks: "Tareas y acciones",
};
