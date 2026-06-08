import type { Database } from "@/integrations/supabase/types";

export type DealMemoEstado = Database["public"]["Enums"]["deal_memo_estado"];
export type DmContactoTipo = Database["public"]["Enums"]["dm_contacto_tipo"];
export type DmEventoTipo = Database["public"]["Enums"]["dm_evento_tipo"];

export const ESTADO_LABEL: Record<DealMemoEstado, string> = {
  borrador: "Borrador",
  generando: "Generando",
  revision_interna: "Revisión interna",
  corrigiendo: "Corrigiendo",
  revision_final: "Revisión final",
  enviado: "Enviado",
  respondido: "Respondido",
  cerrado: "Cerrado",
  cancelado: "Cancelado",
};

export const ESTADO_TONE: Record<DealMemoEstado, string> = {
  borrador:         "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200",
  generando:        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  revision_interna: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
  corrigiendo:      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  revision_final:   "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  enviado:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  respondido:       "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200",
  cerrado:          "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  cancelado:        "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

// Kanban: 6 columnas (algunos estados se agrupan)
export type KanbanColumnKey =
  | "borrador"
  | "revision_interna"
  | "revision_final"
  | "enviado"
  | "respondido"
  | "cerrado";

export const KANBAN_COLUMNS: { key: KanbanColumnKey; label: string; estados: DealMemoEstado[]; bg: string }[] = [
  { key: "borrador",         label: "Borrador",         estados: ["borrador", "generando", "corrigiendo"], bg: "bg-zinc-50 dark:bg-zinc-900/30" },
  { key: "revision_interna", label: "Revisión interna", estados: ["revision_interna"],                     bg: "bg-violet-50/60 dark:bg-violet-950/20" },
  { key: "revision_final",   label: "Revisión final",   estados: ["revision_final"],                       bg: "bg-fuchsia-50/60 dark:bg-fuchsia-950/20" },
  { key: "enviado",          label: "Enviado",          estados: ["enviado"],                              bg: "bg-emerald-50/60 dark:bg-emerald-950/20" },
  { key: "respondido",       label: "Respondido",       estados: ["respondido"],                           bg: "bg-teal-50/60 dark:bg-teal-950/20" },
  { key: "cerrado",          label: "Cerrado",          estados: ["cerrado", "cancelado"],                 bg: "bg-slate-50 dark:bg-slate-900/30" },
];

export const TIPO_CONTACTO_LABEL: Record<DmContactoTipo, string> = {
  interno: "Interno",
  cliente: "Cliente",
  contraparte: "Contraparte",
  validador: "Validador",
};

export const TIPO_CONTACTO_TONE: Record<DmContactoTipo, string> = {
  interno:     "bg-zinc-100 text-zinc-700",
  cliente:     "bg-emerald-100 text-emerald-700",
  contraparte: "bg-blue-100 text-blue-700",
  validador:   "bg-violet-100 text-violet-700",
};

export const EVENTO_LABEL: Record<DmEventoTipo, string> = {
  creado: "Deal memo creado",
  version_generada: "Nueva versión generada",
  enviado_a_revisor_interno: "Enviado a revisor interno",
  aprobado_revisor_interno: "Aprobado por revisor interno",
  correcciones_solicitadas: "Correcciones solicitadas",
  enviado_a_validador_final: "Enviado a validador final",
  aprobado_final: "Aprobado por validador final",
  enviado_a_destinatario: "Enviado al destinatario",
  respuesta_recibida: "Respuesta recibida",
  reminder_enviado: "Recordatorio enviado",
  cerrado: "Deal memo cerrado",
};

export function formatMoneyEs(amount: number | string | null | undefined, moneda = "EUR"): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  const symbol = moneda === "EUR" ? "€" : moneda === "USD" ? "$" : moneda;
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n)} ${symbol}`;
}

/**
 * Calcula la siguiente referencia correlativa anual (DM-IC-YYYY-NNN).
 * Lee del cliente: la unicidad ya está garantizada por la columna `referencia` UNIQUE.
 * El primer correlativo del año arranca en 011.
 */
export function buildNextReference(existing: string[], year = new Date().getFullYear()): string {
  const prefix = `DM-IC-${year}-`;
  const nums = existing
    .filter((r) => r.startsWith(prefix))
    .map((r) => parseInt(r.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  const next = Math.max(max + 1, 11);
  return `${prefix}${String(next).padStart(3, "0")}`;
}