import { describe, test as it, expect } from "bun:test";
import { productionWorkYear } from "@/lib/composer-productions";

describe("productionWorkYear", () => {
  it("usa el inicio de rodaje antes que el año de estreno", () => {
    expect(productionWorkYear({ start_date: "2026-11-01", year: 2027 })).toBe(2026);
  });
  it("sin inicio usa el año y luego la fecha de alta", () => {
    expect(productionWorkYear({ year: 2025 })).toBe(2025);
    expect(productionWorkYear({ created_at: "2024-03-02T00:00:00Z" })).toBe(2024);
  });
});
