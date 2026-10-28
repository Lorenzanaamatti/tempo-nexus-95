import { describe, it, expect } from "bun:test";
import { computeAgencyCommission } from "@/lib/commission";

describe("computeAgencyCommission", () => {
  it("sobre precio negociado ignora los gastos", () => {
    expect(computeAgencyCommission(10000, 15, "precio", 4000)).toBe(1500);
  });
  it("sobre margen descuenta los gastos reales", () => {
    expect(computeAgencyCommission(10000, 15, "margen", 4000)).toBe(900);
  });
  it("margen negativo no genera comisión negativa", () => {
    expect(computeAgencyCommission(1000, 20, "margen", 3000)).toBe(0);
  });
});
