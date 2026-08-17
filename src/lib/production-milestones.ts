/** Hitos de entrega de una producción (tabla production_phases). */
export const MILESTONE_STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  completado: "Completado",
  retrasado: "Retrasado",
  // valores heredados de "fases"
  planificada: "Pendiente",
  en_curso: "Pendiente",
  completada: "Completado",
  bloqueada: "Retrasado",
};

export const MILESTONE_STATUSES = ["pendiente", "completado", "retrasado"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export function normalizeMilestoneStatus(status: string | null | undefined): MilestoneStatus {
  switch (status) {
    case "completado":
    case "completada":
      return "completado";
    case "retrasado":
    case "bloqueada":
      return "retrasado";
    default:
      return "pendiente";
  }
}

export const MILESTONE_TONE: Record<MilestoneStatus, string> = {
  pendiente: "bg-muted text-muted-foreground",
  completado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  retrasado: "bg-destructive/15 text-destructive",
};

export type MilestoneLike = { start_date: string | null; end_date: string | null; status: string | null };

export function isMilestoneOverdue(m: MilestoneLike) {
  if (normalizeMilestoneStatus(m.status) === "completado" || m.end_date) return false;
  if (!m.start_date) return false;
  return m.start_date < new Date().toISOString().slice(0, 10);
}

export const REPRESENTADO_ROLES = [
  { value: "compositor_principal", label: "Compositor principal" },
  { value: "compositor_adicional", label: "Compositor adicional" },
  { value: "supervisor_musical", label: "Supervisor musical" },
  { value: "artista", label: "Artista" },
] as const;

export const REPRESENTADO_ROLE_LABEL: Record<string, string> = Object.fromEntries(
  REPRESENTADO_ROLES.map((r) => [r.value, r.label]),
);