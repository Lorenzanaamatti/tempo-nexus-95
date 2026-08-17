import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { recordListLatency } from "@/lib/list-metrics";

export const PAGE_SIZES = [25, 50, 100, 200];

export type SortDir = "asc" | "desc";

/**
 * Paginación + ordenación en servidor.
 * Devuelve el estado y `applyTo(query)`, que añade `.order()` y `.range()`
 * a una consulta de Supabase. Úsalo con `{ count: "exact" }` en el select
 * para conocer el total. Único sitio donde vive esta lógica.
 */
export function useServerPagination<K extends string>(opts: {
  sortKey: K;
  sortDir?: SortDir;
  pageSize?: number;
  /** Filtros que, al cambiar, deben devolver a la página 1. */
  deps?: unknown[];
  /** Nombre de la lista para las métricas de latencia. */
  list?: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(opts.pageSize ?? 50);
  const [sortKey, setSortKey] = useState<K>(opts.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(opts.sortDir ?? "asc");
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const deps = opts.deps ?? [];

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, pageSize, sortKey, sortDir]);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  function toggleSort(k: K) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function applyTo<T>(query: T, key: string = sortKey): T {
    const q = query as any;
    const built = q.order(key, { ascending: sortDir === "asc", nullsFirst: false }).range(from, to);
    // Instrumentación de latencia: se mide cuando la consulta se resuelve.
    if (typeof built?.then === "function" && !built.__measured) {
      const originalThen = built.then.bind(built);
      built.__measured = true;
      built.then = (onFulfilled: any, onRejected: any) => {
        const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
        return originalThen((res: any) => {
          const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
          recordListLatency({ list: opts.list ?? "lista", ms, at: Date.now(), sortKey: key, sortDir, page });
          setLastLatencyMs(ms);
          return res;
        }).then(onFulfilled, onRejected);
      };
    }
    return built as T;
  }

  return {
    page,
    setPage,
    pageSize,
    setPageSize: (n: number) => {
      setPageSizeState(n);
      setPage(1);
    },
    sortKey,
    sortDir,
    setSortKey,
    setSortDir,
    toggleSort,
    from,
    to,
    applyTo,
    lastLatencyMs,
    pageCountOf: (total: number) => Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Cabecera de tabla ordenable. */
export function SortTh<K extends string>({
  k,
  sortKey,
  sortDir,
  onSort,
  children,
  className = "",
}: {
  k: K;
  sortKey: K;
  sortDir: SortDir;
  onSort: (k: K) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-3 py-2 smallcaps text-xs ${className}`}>
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}
        {sortKey === k ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  );
}

/** Selector de orden para listas que no son tablas. */
export function SortControl<K extends string>({
  options,
  sortKey,
  sortDir,
  onSortKeyChange,
  onSortDirChange,
  className = "",
}: {
  options: { key: K; label: string }[];
  sortKey: K;
  sortDir: SortDir;
  onSortKeyChange: (k: K) => void;
  onSortDirChange: (d: SortDir) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={sortKey} onValueChange={(v) => onSortKeyChange(v as K)}>
        <SelectTrigger className="h-9 w-52 rounded-sm text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              Ordenar por {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="rounded-sm"
        title={sortDir === "asc" ? "Ascendente" : "Descendente"}
        onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
      >
        {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      </Button>
    </div>
  );
}

/**
 * Paginación cliente: recorta un array ya cargado en memoria.
 * Único sitio donde vive esta lógica — reutilízalo en listas nuevas.
 */
export function usePagination<T>(items: T[] | undefined, initialPageSize = 50) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const total = items?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const pageItems = useMemo(
    () => (items ?? []).slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return {
    page,
    setPage,
    pageSize,
    setPageSize: (n: number) => {
      setPageSize(n);
      setPage(1);
    },
    total,
    pageCount,
    pageItems,
  };
}

export type PaginationBarProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  /** Etiqueta en plural, p. ej. "películas". */
  label?: string;
  className?: string;
};

export function PaginationBar({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  label = "resultados",
  className,
}: PaginationBarProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 ${className ?? ""}`}>
      <p className="smallcaps text-xs text-muted-foreground">
        {from}–{to} de {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-auto min-w-[12rem] shrink-0 whitespace-nowrap rounded-sm text-xs [&>span]:line-clamp-none [&>span]:overflow-visible [&>span]:whitespace-nowrap">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)} className="whitespace-nowrap">
                {n} por página
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="rounded-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
