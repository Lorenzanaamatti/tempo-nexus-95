/**
 * Criterio único de "proyecto en curso" para toda la app.
 * Se usa tanto en Roster completo (columna "Proyectos en curso")
 * como en la ficha de compositor (KPI "Proyectos en curso"),
 * para que ambos números coincidan siempre.
 */
export const CLOSED_PRODUCTION_STATUSES = new Set([
  "finalizada",
  "estrenada",
  "cobrado",
  "facturado",
  "entregables_completados",
  "compositor_descartado",
  "comunicado_estreno",
]);

type ProductionLike = { status?: string | null; premiere_date?: string | null };

/** Una producción está en curso mientras no haya alcanzado un estado de cierre. */
export function isOpenProduction(p: ProductionLike) {
  if (p.status && CLOSED_PRODUCTION_STATUSES.has(String(p.status))) return false;
  // Estrenada hace más de 10 días: ya no cuenta como en curso.
  if (p.premiere_date) {
    const cutoff = new Date(p.premiere_date).getTime() + 10 * 24 * 60 * 60 * 1000;
    if (Date.now() > cutoff) return false;
  }
  return true;
}

export function countOpenProductions(list: ProductionLike[]) {
  return list.filter(isOpenProduction).length;
}
