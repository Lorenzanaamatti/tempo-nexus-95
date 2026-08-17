import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderHook, act } from "@testing-library/react";

import { useServerPagination } from "@/components/pagination-bar";
import { getListMetrics, getListSamples, resetListMetrics } from "@/lib/list-metrics";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(here, "..", p), "utf8");

/** Doble de un query builder de Supabase (thenable con .order/.range). */
function fakeQuery(rows: any[] = [], delayMs = 0) {
  const calls: { order: any[]; range: any[] } = { order: [], range: [] };
  const q: any = {
    calls,
    order(key: string, opts: any) {
      calls.order.push([key, opts]);
      return q;
    },
    range(from: number, to: number) {
      calls.range.push([from, to]);
      return q;
    },
    then(onF: any, onR: any) {
      return new Promise((resolve) =>
        setTimeout(() => resolve({ data: rows, error: null, count: rows.length }), delayMs),
      ).then(onF, onR);
    },
  };
  return q;
}

afterEach(() => resetListMetrics());

describe("ordenación y paginación en servidor", () => {
  test("applyTo traduce el estado a .order()/.range() del servidor", async () => {
    const { result } = renderHook(() => useServerPagination({ sortKey: "title", pageSize: 25, list: "test" }));
    const q = fakeQuery();
    await result.current.applyTo(q);
    expect(q.calls.order).toEqual([["title", { ascending: true, nullsFirst: false }]]);
    expect(q.calls.range).toEqual([[0, 24]]);
  });

  test("cambiar dirección y página se refleja en la consulta al servidor", async () => {
    const { result } = renderHook(() => useServerPagination({ sortKey: "title", pageSize: 25, list: "test" }));
    act(() => result.current.setSortDir("desc"));
    act(() => result.current.setPage(3));
    const q = fakeQuery();
    await result.current.applyTo(q);
    expect(q.calls.order[0]).toEqual(["title", { ascending: false, nullsFirst: false }]);
    expect(q.calls.range[0]).toEqual([50, 74]);
  });

  test("toggleSort alterna asc/desc y resetea al cambiar de columna", () => {
    const { result } = renderHook(() => useServerPagination<"title" | "year">({ sortKey: "title", list: "test" }));
    act(() => result.current.toggleSort("title"));
    expect(result.current.sortDir).toBe("desc");
    act(() => result.current.toggleSort("year"));
    expect(result.current.sortKey).toBe("year");
    expect(result.current.sortDir).toBe("asc");
  });

  test("registra la latencia de cada consulta con su lista, orden y página", async () => {
    const { result } = renderHook(() => useServerPagination({ sortKey: "title", list: "peliculas-es" }));
    await result.current.applyTo(fakeQuery([{ id: 1 }], 30));
    const samples = getListSamples("peliculas-es");
    expect(samples).toHaveLength(1);
    expect(samples[0]!.ms).toBeGreaterThanOrEqual(25);
    expect(samples[0]!.sortKey).toBe("title");
    expect(samples[0]!.sortDir).toBe("asc");
    expect(samples[0]!.page).toBe(1);
    const metrics = getListMetrics().find((m) => m.list === "peliculas-es")!;
    expect(metrics.count).toBe(1);
    expect(metrics.maxMs).toBeGreaterThanOrEqual(25);
  });

  test("no duplica la medición si la consulta se espera dos veces", async () => {
    const { result } = renderHook(() => useServerPagination({ sortKey: "title", list: "dup" }));
    const q = result.current.applyTo(fakeQuery());
    await q;
    expect(getListSamples("dup")).toHaveLength(1);
  });
});

const LISTS = [
  "routes/_authenticated/_admin/productions.index.tsx",
  "routes/_authenticated/_admin/opportunities.index.tsx",
  "routes/_authenticated/_admin/contracts.index.tsx",
  "routes/_authenticated/_admin/providers.index.tsx",
  "routes/_authenticated/_admin/people.index.tsx",
  "routes/_authenticated/_admin/peliculas-es.index.tsx",
  "components/catalog-index.tsx",
];

describe("las listas principales ordenan en servidor y miden latencia", () => {
  for (const file of LISTS) {
    test(`${file} usa useServerPagination con nombre de lista`, () => {
      const src = read(file);
      expect(src).toContain("useServerPagination");
      expect(src).toMatch(/useServerPagination<?[^(]*\(\{\s*list:/);
      expect(src).toContain("pg.applyTo(");
    });

    test(`${file} incluye orden y página en la queryKey (refetch al ordenar)`, () => {
      const src = read(file);
      expect(src).toContain("pg.sortKey");
      expect(src).toContain("pg.sortDir");
      expect(src).toContain("pg.page");
    });

    test(`${file} no ordena en cliente sobre los resultados paginados`, () => {
      const src = read(file);
      expect(src).not.toMatch(/\bdata\??\.\s*sort\(/);
      expect(src).not.toMatch(/rows\.sort\(/);
    });
  }
});
