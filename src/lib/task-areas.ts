export const TASK_AREAS = [
  { value: "roster",        label: "Roster" },
  { value: "oportunidades", label: "Oportunidades" },
  { value: "economico",     label: "Económico" },
  { value: "legal",         label: "Legal" },
  { value: "marketing",     label: "Marketing" },
  { value: "comunicacion",  label: "Comunicación" },
  { value: "produccion",    label: "Producción" },
  { value: "general",       label: "General" },
] as const;

export type TaskArea = typeof TASK_AREAS[number]["value"];

export const TASK_AREA_LABEL: Record<TaskArea, string> = TASK_AREAS.reduce(
  (acc, a) => ({ ...acc, [a.value]: a.label }),
  {} as Record<TaskArea, string>,
);

export const TASK_AREA_TONE: Record<TaskArea, string> = {
  roster:        "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  oportunidades: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  economico:     "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  legal:         "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  marketing:     "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  comunicacion:  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  produccion:    "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  general:       "bg-muted text-foreground",
};