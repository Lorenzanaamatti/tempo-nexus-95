export const CONTRACT_STATUS_LABEL = {
  borrador: "Borrador",
  enviado: "Enviado",
  en_revision: "En revisión",
  firmado: "Firmado",
  vencido: "Vencido",
  cancelado: "Cancelado",
} as const;
export type ContractStatus = keyof typeof CONTRACT_STATUS_LABEL;

export const CONTRACT_STATUS_TONE: Record<ContractStatus, string> = {
  borrador: "bg-muted text-foreground",
  enviado: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  en_revision: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  firmado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  vencido: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  cancelado: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
};

export const CONTRACT_LANG_LABEL = {
  ca: "Català",
  es: "Castellano",
  en: "English",
} as const;
export type ContractLanguage = keyof typeof CONTRACT_LANG_LABEL;

// Sugerencias de tipos habituales (free-text, no enum: pueden añadirse libremente).
export const CONTRACT_TYPE_SUGGESTIONS = [
  "Representación artística",
  "Encargo de obra",
  "Cesión de derechos",
  "Sincronización",
  "Edición musical",
  "Producción audiovisual",
  "Coproducción",
  "Confidencialidad (NDA)",
  "Prestación de servicios",
  "Colaboración",
  "Licencia",
  "Distribución",
  "Patrocinio",
  "Laboral",
  "Arrendamiento",
  "Otro",
];