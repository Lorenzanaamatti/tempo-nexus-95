import type { QueryClient } from "@tanstack/react-query";
import { invalidateProductionTimelines } from "@/components/production-detail/change-reason-dialog";

/** Tras cambiar un sprint de facturación, refresca fichas, Gantt, calendarios y paneles económicos. */
export function invalidateBillingSprints(qc: QueryClient) {
  invalidateProductionTimelines(qc);
  for (const k of [
    "billing-sprints", "billing-plan-combined", "calendar-production-billing-sprints-min", "production-economics",
  ]) qc.invalidateQueries({ queryKey: [k] });
}
