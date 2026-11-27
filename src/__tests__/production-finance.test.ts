import { describe, expect, test } from "bun:test";
import { computeFinance, pctOfIncome, type FinanceLine, type IcFeeConfig } from "@/lib/production-finance";

const lines: FinanceLine[] = [
  { kind: "ingreso", amount_initial: 30000, amount_final: 32900 },
  { kind: "gasto", amount_initial: 8000, amount_final: 9200 },
];
const base: IcFeeConfig = { mode: "pct", basis: "precio", pctInitial: 20, pctFinal: 20, fixedInitial: null, fixedFinal: null };

describe("seguimiento económico", () => {
  test("fee % sobre ingresos", () => {
    const r = computeFinance(lines, base).final;
    expect(r.margen).toBe(23700);
    expect(r.fee).toBe(6580);
    expect(r.resultado).toBe(17120);
  });
  test("fee % sobre margen operativo", () => {
    expect(computeFinance(lines, { ...base, basis: "margen" }).final.fee).toBe(4740);
  });
  test("fee de precio fijo ignora el porcentaje", () => {
    const r = computeFinance(lines, { ...base, mode: "fijo", fixedFinal: 1000 }).final;
    expect(r.fee).toBe(1000);
    expect(r.resultado).toBe(22700);
  });
  test("porcentaje sobre ingresos", () => {
    expect(pctOfIncome(10450, 42550)).toBe(24.6);
    expect(pctOfIncome(5, 0)).toBeNull();
  });
});

describe("gastos abonados por la agencia", () => {
  const cfg = { mode: "pct" as const, basis: "precio" as const, pctInitial: 10, pctFinal: 10, fixedInitial: null, fixedFinal: null };
  test("no restan del resultado del artista y se informan aparte", () => {
    const f = computeFinance([
      { kind: "ingreso", amount_initial: 1000, amount_final: 1000 },
      { kind: "gasto", amount_initial: 200, amount_final: 200 },
      { kind: "gasto", amount_initial: 300, amount_final: 300, paid_by_agency: true },
    ], cfg);
    expect(f.initial.gastos).toBe(200);
    expect(f.initial.extraordinarios).toBe(300);
    expect(f.initial.resultado).toBe(700);
  });
});
