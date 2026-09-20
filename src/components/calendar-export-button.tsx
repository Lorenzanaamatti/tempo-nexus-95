import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { downloadRowsAsExcel, stamp, type ExportColumn } from "@/components/export-rows-button";

export type CalendarExportRow = {
  production: string;
  client: string;
  person: string;
  section: string;
  type: string;
  start: string;
  end: string;
  notes: string;
};

const COLUMNS: ExportColumn<CalendarExportRow>[] = [
  { key: "production", label: "Producción" },
  { key: "client", label: "Cliente" },
  { key: "person", label: "Persona" },
  { key: "section", label: "Sección" },
  { key: "type", label: "Tipo / proceso" },
  { key: "start", label: "Inicio" },
  { key: "end", label: "Fin" },
  { key: "notes", label: "Observaciones" },
];

async function downloadPdf(rows: CalendarExportRow[], title: string, subtitle: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = (autoTableModule as any).default ?? autoTableModule;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(17);
  doc.setTextColor(71, 53, 63);
  doc.text(title, 38, 38);
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(subtitle, 38, 55, { maxWidth: 760 });
  autoTable(doc, {
    startY: 70,
    head: [COLUMNS.map((column) => column.label)],
    body: rows.map((row) => COLUMNS.map((column) => String((row as any)[column.key] ?? ""))),
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [71, 53, 63], textColor: 255 },
    alternateRowStyles: { fillColor: [249, 254, 255] },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 95 }, 2: { cellWidth: 85 }, 4: { cellWidth: 95 }, 7: { cellWidth: 120 } },
  });
  doc.save(`calendario-general-${stamp()}.pdf`);
}

export function CalendarExportButton({ rows, view, summary }: { rows: CalendarExportRow[]; view: "Gantt" | "Calendario"; summary: string }) {
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);
  async function run(format: "excel" | "pdf") {
    if (!rows.length) return toast.error("No hay datos con estos filtros");
    setBusy(format);
    try {
      if (format === "excel") await downloadRowsAsExcel(rows, { filename: `calendario-general-${view.toLowerCase()}`, sheetName: view, columns: COLUMNS });
      else await downloadPdf(rows, `Calendario General · ${view}`, `${summary} · ${rows.length} registros · ${stamp()}`);
      toast.success(`Vista ${view.toLowerCase()} descargada en ${format === "excel" ? "Excel" : "PDF"}`);
    } catch (error: any) {
      toast.error(error?.message ?? "No se pudo preparar la descarga");
    } finally {
      setBusy(null);
    }
  }
  return <Popover><PopoverTrigger asChild><Button size="sm" variant="outline"><Download className="mr-1 h-4 w-4"/>Descargar vista</Button></PopoverTrigger><PopoverContent align="end" className="w-64"><p className="mb-3 text-sm text-muted-foreground">Se descargarán los {rows.length} registros filtrados.</p><div className="flex gap-2"><Button className="flex-1" size="sm" onClick={() => run("excel")} disabled={busy !== null}>{busy === "excel" ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <FileSpreadsheet className="mr-1 h-4 w-4"/>}Excel</Button><Button className="flex-1" size="sm" variant="secondary" onClick={() => run("pdf")} disabled={busy !== null}>{busy === "pdf" ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <FileText className="mr-1 h-4 w-4"/>}PDF</Button></div></PopoverContent></Popover>;
}