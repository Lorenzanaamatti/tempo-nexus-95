export type CommissionBasis = "precio" | "margen";

/** Comisión de la agencia: % sobre el precio negociado o sobre el margen del compositor (precio − gastos reales). */
export function computeAgencyCommission(
  fee: number | null | undefined,
  pct: number | null | undefined,
  basis: CommissionBasis | null | undefined,
  realExpenses = 0,
): number | null {
  if (fee == null || pct == null || !Number.isFinite(fee) || !Number.isFinite(pct)) return null;
  const base = basis === "margen" ? Math.max(0, fee - realExpenses) : fee;
  return Math.round(base * pct) / 100;
}
