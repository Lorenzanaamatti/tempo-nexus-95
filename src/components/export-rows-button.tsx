import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Botón genérico "Excel" para cualquier listado ya cargado en pantalla.
 * Si no se pasan columnas, se deducen de las claves de la primera fila.
 * Para listados grandes con selección de campos, usa <ExportButton />.
 */
export type ExportColumn<T> = { key: string; label: string; get?: (row: T) => unknown };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;
const HIDDEN_KEYS = /^(id|.*_id|user_id|created_at|updated_at|tsv|search_vector)$/;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function stamp(d = new Date()) {
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function fmt(v: unknown): string | number | boolean {
  if (v == null) return "";
  if (v instanceof Date) return `${pad(v.getDate())}/${pad(v.getMonth() + 1)}/${v.getFullYear()}`;
  if (Array.isArray(v)) return v.map((x) => fmt(x)).join(", ");
  if (typeof v === "string" && ISO_DATE_RE.test(v)) {
    const [y, m, d] = v.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const label = o["full_name"] ?? o["name"] ?? o["nombre"] ?? o["titulo"] ?? o["title"];
    return label != null ? String(label) : JSON.stringify(v);
  }
  return v as string | number | boolean;
}

function prettify(key: string) {
  return key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function autoColumns(rows: any[]): ExportColumn<any>[] {
  const keys = new Set<string>();
  for (const r of rows.slice(0, 50)) {
    if (r && typeof r === "object") Object.keys(r).forEach((k) => keys.add(k));
  }
  return [...keys]
    .filter((k) => !HIDDEN_KEYS.test(k))
    .map((k) => ({ key: k, label: prettify(k) }));
}

export async function downloadRowsAsExcel<T>(
  rows: T[],
  opts: { filename: string; sheetName?: string; columns?: ExportColumn<T>[] },
) {
  const XLSX = await import("xlsx");
  const cols = opts.columns?.length ? opts.columns : autoColumns(rows as any[]);
  const aoa: unknown[][] = [cols.map((c) => c.label)];
  for (const r of rows) {
    aoa.push(cols.map((c) => fmt(c.get ? c.get(r) : (r as any)?.[c.key])));
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = cols.map((c) => ({ wch: Math.min(40, Math.max(12, c.label.length + 4)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (opts.sheetName ?? "Datos").slice(0, 31));
  XLSX.writeFile(wb, `${opts.filename}-${stamp()}.xlsx`);
}

export function ExportRowsButton<T>({
  rows,
  columns,
  filename,
  sheetName,
  label = "Excel",
  variant = "outline",
  size = "sm",
  className,
  fetchAll,
}: {
  rows: T[] | undefined | null;
  columns?: ExportColumn<T>[];
  filename: string;
  sheetName?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  /** Si se indica, se usa para descargar el listado completo (no solo la página visible). */
  fetchAll?: () => Promise<T[]>;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const data = fetchAll ? await fetchAll() : (rows ?? []);
      if (!data.length) {
        toast.error("No hay filas que exportar");
        return;
      }
      await downloadRowsAsExcel(data, { filename, sheetName, columns });
      toast.success(`Exportadas ${data.length} filas`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al exportar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={run} disabled={busy} title="Descargar en Excel">
      {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
      {label}
    </Button>
  );
}