export const SUBVENCION_ESTADOS = [
  "Por preparar", "En preparación", "Pendiente firma", "Presentada", "Subsanación",
  "Concedida", "Denegada", "En ejecución", "En justificación", "Cobrada", "Cerrada",
] as const;

export const SUBVENCION_TIPOS = ["Subvención", "Préstamo", "Bonificación", "Financiación", "Otra"] as const;

export const SUBVENCION_HITOS = [
  "Solicitud", "Firma", "Subsanación", "Resolución", "Aceptación",
  "Inicio proyecto", "Fin proyecto", "Justificación", "Cobro",
] as const;

export const DOCUMENTO_ESTADOS = ["Pendiente", "En preparación", "Terminado"] as const;
export const TAREA_ESTADOS = ["Pendiente", "En curso", "Bloqueada", "Terminada"] as const;
export const TAREA_PRIORIDADES = ["Baja", "Media", "Alta", "Urgente"] as const;

export function daysUntilGrant(date?: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}

export function grantDeadlineLabel(date?: string | null) {
  const days = daysUntilGrant(date);
  if (days === null) return "Sin fecha";
  if (days < 0) return "Vencida";
  if (days === 0) return "Hoy";
  return `${days} días`;
}