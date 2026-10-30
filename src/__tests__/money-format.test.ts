import { describe, expect, it } from "vitest";
import { formatEUR, formatEUR0, formatNumberEs } from "@/lib/money";

describe("formato de cifras", () => {
  it("separador de miles también con cuatro cifras", () => {
    expect(formatNumberEs(3000)).toBe("3.000,00");
  });
  it("dos decimales por defecto, también en totales", () => {
    expect(formatEUR0(1234567)).toBe("1.234.567,00 €");
    expect(formatEUR(15)).toBe("15,00 €");
  });
});
