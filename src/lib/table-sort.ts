import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir } | null;

/** Compara valores mezclados: números, fechas ISO (yyyy-mm-dd) y texto con orden alfabético español. */
export function compareValues(a: unknown, b: unknown): number {
  const empty = (v: unknown) => v == null || v === "";
  if (empty(a) && empty(b)) return 0;
  if (empty(a)) return 1;
  if (empty(b)) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}

export function sortRows<T, K extends string>(rows: T[], sort: SortState<K>, get: (row: T, key: K) => unknown): T[] {
  if (!sort) return rows;
  const m = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((x, y) => {
    const vx = get(x, sort.key), vy = get(y, sort.key);
    const c = compareValues(vx, vy);
    // Los vacíos siempre al final, sea cual sea la dirección.
    if (vx == null || vx === "" || vy == null || vy === "") return c;
    return c * m;
  });
}

/** Orden de tabla por columna: primer clic ascendente (A‑Z / más antigua), segundo descendente, tercero sin orden. */
export function useTableSort<T, K extends string>(rows: T[], get: (row: T, key: K) => unknown, initial: SortState<K> = null) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const sorted = useMemo(() => sortRows(rows, sort, get), [rows, sort]);
  const toggle = (key: K) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
  return { sorted, sort, toggle };
}

/** Filtra por periodo (fechas ISO yyyy-mm-dd, extremos incluidos). */
export function inDateRange(date: string | null | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!date) return false;
  const d = date.slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}
