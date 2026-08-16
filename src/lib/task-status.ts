export const TASK_STATUSES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_curso", label: "En curso" },
  { value: "bloqueada", label: "Bloqueada" },
  { value: "hecha", label: "Hecha" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  bloqueada: "Bloqueada",
  hecha: "Hecha",
};

export const TASK_STATUS_TONE: Record<TaskStatus, string> = {
  pendiente: "bg-muted text-foreground",
  en_curso: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  bloqueada: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  hecha: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

/** Fecha de hoy en formato ISO (YYYY-MM-DD), hora local. */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
