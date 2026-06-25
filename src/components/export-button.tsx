import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type ExportField<T> = {
  key: string;
  label: string;
  default?: boolean;
  get: (row: T) => unknown;
  /**
   * Si el valor es un array y `expandArray` es true, en lugar de unir los
   * elementos en una celda con ", " se genera una columna por elemento
   * (etiqueta "Label 1", "Label 2", …) hasta el máximo encontrado en los
   * datos. Útil para listas con nombres que ya contienen comas o puntos
   * (p. ej. "Warner Bros.", "Productora, S.L.").
   */
  expandArray?: boolean;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function toDDMMYYYY(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatCellValue(v: unknown): string | number | boolean {
  if (v == null) return "";
  if (v instanceof Date) return toDDMMYYYY(v);
  if (Array.isArray(v)) return v.map((x) => formatCellValue(x)).join(", ");
  if (typeof v === "string" && ISO_DATE_RE.test(v)) {
    const [y, m, d] = v.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  if (typeof v === "object") return JSON.stringify(v);
  return v as string | number | boolean;
}

type Props<T> = {
  filename: string;
  sheetName?: string;
  fields: ExportField<T>[];
  fetchAll: () => Promise<T[]>;
  buttonLabel?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg";
  entityLabel?: string;
};

export function ExportButton<T>({
  filename,
  sheetName = "Datos",
  fields,
  fetchAll,
  buttonLabel = "Exportar",
  variant = "outline",
  size = "sm",
  entityLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.default !== false])),
  );
  const [busy, setBusy] = useState(false);

  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected]);

  function toggleAll(value: boolean) {
    setSelected(Object.fromEntries(fields.map((f) => [f.key, value])));
  }

  async function exportNow() {
    if (!anySelected) return toast.error("Selecciona al menos un campo");
    setBusy(true);
    try {
      const rows = await fetchAll();
      const cols = fields.filter((f) => selected[f.key]);
      // Pre-calculate max array length for expandable columns.
      const expansion = new Map<string, number>();
      for (const c of cols) {
        if (!c.expandArray) continue;
        let max = 0;
        for (const r of rows) {
          const v = c.get(r);
          if (Array.isArray(v) && v.length > max) max = v.length;
        }
        expansion.set(c.key, Math.max(max, 1));
      }
      const header: string[] = [];
      for (const c of cols) {
        const n = expansion.get(c.key);
        if (n && n > 1) {
          for (let i = 0; i < n; i++) header.push(`${c.label} ${i + 1}`);
        } else {
          header.push(c.label);
        }
      }
      const aoa: unknown[][] = [header];
      for (const r of rows) {
        const row: unknown[] = [];
        for (const c of cols) {
          const n = expansion.get(c.key);
          const v = c.get(r);
          if (n && n > 1) {
            const arr = Array.isArray(v) ? v : v == null ? [] : [v];
            for (let i = 0; i < n; i++) {
              row.push(arr[i] == null ? "" : formatCellValue(arr[i]));
            }
          } else {
            row.push(formatCellValue(v));
          }
        }
        aoa.push(row);
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
      const stamp = toDDMMYYYY(new Date()).replace(/\//g, "-");
      XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
      toast.success(`Exportadas ${rows.length} filas`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al exportar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Download className="mr-1 h-4 w-4" /> {buttonLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Exportar a Excel{entityLabel ? ` · ${entityLabel}` : ""}</DialogTitle>
            <DialogDescription>
              Marca los campos que quieres incluir. Se descargará un archivo .xlsx con todos los registros.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between border-b border-border pb-2 text-xs text-muted-foreground">
            <span>{Object.values(selected).filter(Boolean).length} de {fields.length} campos</span>
            <div className="flex gap-3">
              <button type="button" className="hover:underline" onClick={() => toggleAll(true)}>Todos</button>
              <button type="button" className="hover:underline" onClick={() => toggleAll(false)}>Ninguno</button>
            </div>
          </div>
          <div className="max-h-[50vh] grid grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto py-2">
            {fields.map((f) => (
              <label key={f.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={!!selected[f.key]}
                  onCheckedChange={(v) => setSelected((s) => ({ ...s, [f.key]: !!v }))}
                />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={exportNow} disabled={busy || !anySelected}>
              {busy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generando…</> : <><Download className="mr-1 h-4 w-4" /> Descargar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}