import { ReactNode, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ExportButton, type ExportField } from "@/components/export-button";
import { PaginationBar, SortControl, useServerPagination } from "@/components/pagination-bar";

/**
 * Pantalla genérica de catálogo CRM (directores, productoras, plataformas…).
 * Único sitio donde vive la lógica de listar / crear / borrar de estos
 * catálogos: no dupliques este patrón en rutas nuevas, reutiliza el componente.
 */
export type CatalogIndexProps = {
  /** Tabla de Supabase. */
  table: string;
  /** Columna con el nombre visible (y de orden). */
  nameColumn: string;
  queryKey: string;
  eyebrow?: string;
  title: string;
  description: string;
  createPlaceholder: string;
  createLabel: string;
  emptyLabel: string;
  deleteConfirm: string;
  exportLabel: string;
  exportFilename: string;
  exportFields: ExportField<any>[];
  /** Texto secundario de cada fila. */
  subtitle: (row: any) => string;
  /** Envoltorio opcional del nombre (p. ej. un Link a la ficha). */
  renderLink?: (row: any, children: ReactNode) => ReactNode;
  /** Contenido extra editable bajo cada fila (modo edición en línea). */
  renderExtra?: (row: any, update: (patch: Record<string, unknown>) => void) => ReactNode;
  /** Campos ordenables adicionales (además del nombre). */
  sortOptions?: { key: string; label: string }[];
  /**
   * Columnas que necesita el listado. Por defecto pide todas ("*"); indica solo
   * las visibles para aligerar la consulta en catálogos con textos largos.
   */
  listColumns?: string;
};

export function CatalogIndex(props: CatalogIndexProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const db = supabase as any;

  const sortOptions = props.sortOptions ?? [
    { key: props.nameColumn, label: "nombre" },
    { key: "created_at", label: "fecha de alta" },
  ];

  const pg = useServerPagination<string>({ list: props.queryKey, sortKey: props.nameColumn, pageSize: 50 });

  const { data: result, isLoading } = useQuery({
    queryKey: [props.queryKey, pg.page, pg.pageSize, pg.sortKey, pg.sortDir],
    queryFn: async () => {
      const { data, error, count } = await pg.applyTo(
        db.from(props.table).select(props.listColumns ?? "*", { count: "exact" }),
      );
      if (error) throw error;
      return { rows: (data ?? []) as any[], count: count ?? 0 };
    },
    placeholderData: (prev: any) => prev,
  });

  const data = result?.rows;
  const total = result?.count ?? 0;

  const invalidate = () => qc.invalidateQueries({ queryKey: [props.queryKey] });

  async function create() {
    if (!name.trim()) return;
    const { error } = await db.from(props.table).insert({ [props.nameColumn]: name.trim() });
    if (error) return toast.error(error.message);
    setName("");
    invalidate();
  }

  async function update(id: string, patch: Record<string, unknown>) {
    const { error } = await db.from(props.table).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function remove(id: string) {
    if (!confirm(props.deleteConfirm)) return;
    const { error } = await db.from(props.table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  const inline = !!props.renderExtra;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="smallcaps text-muted-foreground">{props.eyebrow ?? "CRM"}</p>
            <h1 className="mt-1 font-display text-5xl">{props.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{props.description}</p>
          </div>
          <div className="flex items-center gap-2">
          <SortControl
            options={sortOptions}
            sortKey={pg.sortKey}
            sortDir={pg.sortDir}
            onSortKeyChange={pg.setSortKey}
            onSortDirChange={pg.setSortDir}
          />
          <ExportButton
            entityLabel={props.exportLabel}
            filename={props.exportFilename}
            sheetName={props.exportLabel}
            fetchAll={async () => {
              const { data, error } = await db.from(props.table).select("*").order(props.nameColumn);
              if (error) throw error;
              return data ?? [];
            }}
            fields={props.exportFields}
          />
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-sm border border-dashed border-border p-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={props.createPlaceholder}
          className="w-72"
        />
        <Button onClick={create} disabled={!name.trim()}>
          <Plus className="mr-1 h-4 w-4" /> {props.createLabel}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">{props.emptyLabel}</p>
      ) : inline ? (
        <>
        <div className="space-y-3">
          {(data ?? []).map((row) => (
            <div key={row.id} className="rounded-sm border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <Input
                  defaultValue={row[props.nameColumn] ?? ""}
                  className="font-display text-lg"
                  onBlur={(e) =>
                    e.target.value !== row[props.nameColumn] && update(row.id, { [props.nameColumn]: e.target.value })
                  }
                />
                <Button variant="ghost" size="sm" onClick={() => remove(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {props.renderExtra?.(row, (patch) => update(row.id, patch))}
            </div>
          ))}
        </div>
        <PaginationBar latencyMs={pg.lastLatencyMs} page={pg.page} pageCount={pg.pageCountOf(total)} pageSize={pg.pageSize} total={total} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} label="registros" />
        </>
      ) : (
        <>
        <div className="divide-y divide-border rounded-sm border border-border">
          {(data ?? []).map((row) => {
            const body = (
              <>
                <div className="font-display text-lg hover:underline">{row[props.nameColumn]}</div>
                <div className="text-xs text-muted-foreground">{props.subtitle(row)}</div>
              </>
            );
            return (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                {props.renderLink ? props.renderLink(row, body) : <div className="flex-1">{body}</div>}
                <Button variant="ghost" size="sm" onClick={() => remove(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
        <PaginationBar latencyMs={pg.lastLatencyMs} page={pg.page} pageCount={pg.pageCountOf(total)} pageSize={pg.pageSize} total={total} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} label="registros" />
        </>
      )}
    </div>
  );
}
