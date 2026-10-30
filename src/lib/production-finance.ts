/** Cálculo del seguimiento económico de una producción (ingresos, gastos, margen, fee agencia IC, resultado composer). */
export type FinanceLine = {
  kind: "ingreso" | "gasto";
  amount_initial: number | null;
  amount_final: number | null;
};

export type IcFeeConfig = {
  mode: "pct" | "fijo";
  /** "precio" = % sobre ingresos; "margen" = % sobre margen operativo. */
  basis: "precio" | "margen";
  pctInitial: number | null;
  pctFinal: number | null;
  fixedInitial: number | null;
  fixedFinal: number | null;
};

export type FinanceColumn = { ingresos: number; gastos: number; margen: number; fee: number; resultado: number };

const n = (v: number | null | undefined) => (v == null || !Number.isFinite(Number(v)) ? 0 : Number(v));
const round2 = (v: number) => Math.round(v * 100) / 100;

function column(lines: FinanceLine[], key: "amount_initial" | "amount_final", pct: number | null, fixed: number | null, cfg: IcFeeConfig): FinanceColumn {
  const ingresos = round2(lines.filter((l) => l.kind === "ingreso").reduce((s, l) => s + n(l[key]), 0));
  const gastos = round2(lines.filter((l) => l.kind === "gasto").reduce((s, l) => s + n(l[key]), 0));
  const margen = round2(ingresos - gastos);
  let fee = 0;
  if (cfg.mode === "fijo") fee = n(fixed);
  else {
    const base = cfg.basis === "margen" ? Math.max(0, margen) : ingresos;
    fee = round2((base * n(pct)) / 100);
  }
  return { ingresos, gastos, margen, fee, resultado: round2(margen - fee) };
}

export function computeFinance(lines: FinanceLine[], cfg: IcFeeConfig) {
  return {
    initial: column(lines, "amount_initial", cfg.pctInitial, cfg.fixedInitial, cfg),
    final: column(lines, "amount_final", cfg.pctFinal, cfg.fixedFinal, cfg),
  };
}

/** Porcentaje sobre ingresos (null si no hay ingresos). */
export function pctOfIncome(value: number, ingresos: number): number | null {
  return ingresos ? Math.round((value / ingresos) * 1000) / 10 : null;
}

/** Texto de la liquidación para la orden de facturación. */
export function liquidationText(cfg: IcFeeConfig, fee: number, fmt: (v: number) => string): string {
  if (cfg.mode === "fijo") return `Precio fijo: ${fmt(fee)}`;
  const base = cfg.basis === "margen" ? "margen operativo" : "ingresos";
  return `${String(cfg.pctFinal ?? 0).replace(".", ",")} % sobre ${base} = ${fmt(fee)}`;
}
