import type { ProductionStatus } from "@/lib/production-constants";

export const PRODUCTION_STAGE_LABEL = {
  negociacion: "En negociación",
  produccion: "En producción",
  entrega: "En entrega",
  revision: "Revisión",
  finalizada: "Finalizada",
} as const;

export type ProductionStage = keyof typeof PRODUCTION_STAGE_LABEL;

export const PRODUCTION_STAGE_TONE: Record<ProductionStage, string> = {
  negociacion: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  produccion: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  entrega: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  revision: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  finalizada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

/** Default DB status written when the user picks a lifecycle stage. */
export const STAGE_DEFAULT_STATUS: Record<ProductionStage, ProductionStatus> = {
  negociacion: "contrato_negociacion",
  produccion: "en_produccion",
  entrega: "entrega_parcial",
  revision: "entregables_completados",
  finalizada: "finalizada",
};

const STAGE_BY_STATUS: Record<string, ProductionStage> = {
  pitch_enviado: "negociacion",
  compositor_confirmado: "negociacion",
  presupuesto_enviado: "negociacion",
  presupuesto_confirmado: "negociacion",
  contrato_enviado: "negociacion",
  contrato_negociacion: "negociacion",
  contrato_firmado: "produccion",
  visuales_entregados: "produccion",
  en_composicion: "produccion",
  en_produccion: "produccion",
  en_mezclas: "entrega",
  entrega_parcial: "entrega",
  entrega_total: "entrega",
  entregables_completados: "revision",
  finalizada: "finalizada",
  estrenada: "finalizada",
  comunicado_estreno: "finalizada",
  nominada: "finalizada",
  premiada: "finalizada",
  comunicada_nominacion: "finalizada",
  comunicado_premio: "finalizada",
  compositor_descartado: "finalizada",
};

export function stageOf(status: string | null | undefined): ProductionStage {
  if (!status) return "negociacion";
  return STAGE_BY_STATUS[status] ?? "negociacion";
}

export const FINALIZED_STATUSES = Object.entries(STAGE_BY_STATUS)
  .filter(([, stage]) => stage === "finalizada")
  .map(([status]) => status);

export function isFinalized(status: string | null | undefined) {
  return stageOf(status) === "finalizada";
}
