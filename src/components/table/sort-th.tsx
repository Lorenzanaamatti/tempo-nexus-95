import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortState } from "@/lib/table-sort";

/** Cabecera de columna clicable para ordenar. */
export function SortTh<K extends string>({ label, k, sort, onSort, className = "" }: { label: string; k: K; sort: SortState<K>; onSort: (k: K) => void; className?: string }) {
  const active = sort?.key === k;
  const Icon = !active ? ArrowUpDown : sort!.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={className} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}<Icon className={`h-3 w-3 ${active ? "" : "opacity-40"}`} aria-hidden />
      </button>
    </th>
  );
}

/** Filtro de periodo desde/hasta. */
export function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const cls = "h-8 rounded-sm border border-border bg-background px-2 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-1">Desde <input type="date" className={cls} value={from} onChange={(e) => onChange(e.target.value, to)} /></label>
      <label className="flex items-center gap-1">Hasta <input type="date" className={cls} value={to} onChange={(e) => onChange(from, e.target.value)} /></label>
      {(from || to) && <button type="button" className="text-xs text-primary underline" onClick={() => onChange("", "")}>Quitar periodo</button>}
    </div>
  );
}
