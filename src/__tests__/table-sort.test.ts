import { describe, expect, test } from "bun:test";
import { sortRows, inDateRange } from "@/lib/table-sort";

describe("orden de tablas", () => {
  const rows = [{ t: "Ñandú", d: "2025-03-01" }, { t: "abeto", d: "2023-01-10" }, { t: "Zeta", d: null }];
  test("texto A‑Z con orden español", () => {
    expect(sortRows(rows, { key: "t", dir: "asc" }, (r, k) => (r as any)[k]).map((r) => r.t)).toEqual(["abeto", "Ñandú", "Zeta"]);
  });
  test("fechas de más antigua a más reciente, vacías al final", () => {
    expect(sortRows(rows, { key: "d", dir: "asc" }, (r, k) => (r as any)[k]).map((r) => r.d)).toEqual(["2023-01-10", "2025-03-01", null]);
    expect(sortRows(rows, { key: "d", dir: "desc" }, (r, k) => (r as any)[k]).map((r) => r.d)).toEqual(["2025-03-01", "2023-01-10", null]);
  });
  test("periodo concreto", () => {
    expect(inDateRange("2025-03-01", "2025-01-01", "2025-12-31")).toBe(true);
    expect(inDateRange("2023-01-10", "2025-01-01", "")).toBe(false);
  });
});
