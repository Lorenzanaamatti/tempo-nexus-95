import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadRowsAsExcel, stamp, type ExportColumn } from "@/components/export-rows-button";
import { formatDateEs } from "@/lib/dates";
import type { PartnerRecord, PartnerTipo } from "@/lib/partners-model";

const db = supabase as any;

const COLUMNS: ExportColumn<PartnerRecord>[] = [
  { key: "nombre", label: "Nombre" },
  { key: "tipo", label: "Tipo" },
  { key: "subtipo", label: "Subtipo" },
  { key: "ambito", label: "Ámbito" },
  { key: "ciudad", label: "Ciudad" },
  { key: "pais", label: "País" },
  { key: "contacto_principal", label: "Contacto" },
  { key: "contacto_email", label: "Email" },
  { key: "contacto_telefono", label: "Teléfono" },
  { key: "website", label: "Web" },
  { key: "updated_at", label: "Actualizado", get: (r) => formatDateEs(r.updated_at) },
];

async function fetchOthers(tipo: PartnerTipo): Promise<PartnerRecord[]> {
  const { data, error } = await db.from("partners").select("*").neq("tipo", tipo).order("nombre");
  if (error) throw error;
  return (data ?? []) as PartnerRecord[];
}

async function downloadPdf(rows: PartnerRecord[], title: string, filename: string) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = (autoTableMod as any).default ?? autoTableMod;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(title, 40, 40);
  doc.setFontSize(9);
  doc.text(`${rows.length} registros · ${stamp()}`, 40, 56);
  autoTable(doc, {
    startY: 70,
    head: [COLUMNS.map((c) => c.label)],
    body: rows.map((r) => COLUMNS.map((c) => String((c.get ? c.get(r) : (r as any)[c.key]) ?? ""))),
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [71, 53, 63], textColor: 255 },
  });
  doc.save(`${filename}-${stamp()}.pdf`);
}

/**
 * Exportación de partners en Excel o PDF, con opción de incluir
 * también el resto de partners (otras tipologías) en el mismo archivo.
 */
export function PartnersExportButton({
  rows,
  tipo,
  title,
  filename,
}: {
  rows: PartnerRecord[];
  tipo?: PartnerTipo;
  title: string;
  filename: string;
}) {
  const [includeOthers, setIncludeOthers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function build(): Promise<PartnerRecord[]> {
    if (!tipo || !includeOthers) return rows;
    const others = await fetchOthers(tipo);
    return [...rows, ...others];
  }

  async function run(format: "excel" | "pdf") {
    setBusy(true);
    try {
      const data = await build();
      if (!data.length) {
        toast.error("No hay filas que exportar");
        return;
      }
      if (format === "excel") {
        await downloadRowsAsExcel(data, { filename, sheetName: "Partners", columns: COLUMNS });
      } else {
        await downloadPdf(data, title, filename);
      }
      toast.success(`Exportados ${data.length} partners`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al exportar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" title="Descargar listado">
          <Download className="mr-1 h-4 w-4" /> Exportar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <p className="smallcaps text-xs text-muted-foreground">Exportar {title.toLowerCase()}</p>
        {tipo && (
          <div className="flex items-start gap-2">
            <Checkbox
              id="include-others"
              checked={includeOthers}
              onCheckedChange={(v) => setIncludeOthers(v === true)}
            />
            <Label htmlFor="include-others" className="text-sm font-normal leading-snug">
              Incluir también el resto de partners
            </Label>
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" disabled={busy} onClick={() => run("excel")}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-1 h-4 w-4" />}
            Excel
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={() => run("pdf")}>
            <FileText className="mr-1 h-4 w-4" /> PDF
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
