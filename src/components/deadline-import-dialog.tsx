import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

type Field = { key: string; label: string; required?: boolean; type?: string; options?: readonly string[] };
type Existing = Record<string, unknown>;
type ParsedRow = { id: number; selected: boolean; values: Record<string, unknown>; errors: string[]; duplicate?: Existing; action: "create" | "update" | "skip" };

const db = supabase as any;
const clean = (v: unknown) => String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function parseDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const es = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (es) return `${es[3]}-${es[2].padStart(2, "0")}-${es[1].padStart(2, "0")}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function DeadlineImportDialog({ table, title, nameKey, fields, existing, onImported }: { table: string; title: string; nameKey: string; fields: Field[]; existing: Existing[]; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheet, setSheet] = useState("");
  const [workbook, setWorkbook] = useState<any>(null);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [saving, setSaving] = useState(false);

  const importFields = useMemo(() => fields.filter((f) => !["composer", "production", "institucion"].includes(f.type ?? "")), [fields]);

  async function loadFile(file: File) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    setWorkbook(wb); setSheetNames(wb.SheetNames); setSheet(wb.SheetNames[0] ?? "");
    loadSheet(wb, wb.SheetNames[0] ?? "");
  }

  async function loadSheet(wb: any, name: string) {
    const XLSX = await import("xlsx");
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], { defval: "" });
    const headers = Object.keys(data[0] ?? {});
    const auto: Record<string, string> = {};
    for (const f of importFields) {
      const match = headers.find((h) => clean(h) === clean(f.label) || clean(h) === clean(f.key));
      if (match) auto[f.key] = match;
    }
    setRawRows(data); setMapping(auto); setRows([]);
  }

  function review() {
    const parsed = rawRows.map((raw, index): ParsedRow => {
      const values: Record<string, unknown> = {};
      const errors: string[] = [];
      for (const f of importFields) {
        const source = mapping[f.key];
        let value = source ? raw[source] : null;
        if (f.type === "date" && value) {
          value = parseDate(value);
          if (!value) errors.push(`${f.label}: fecha no válida`);
        }
        if (f.type === "number" && value !== "" && value != null) value = Number(String(value).replace(/\./g, "").replace(",", "."));
        if (f.options?.length && value && !f.options.includes(String(value))) errors.push(`${f.label}: valor no permitido`);
        if (f.required && !value) errors.push(`Falta ${f.label}`);
        if (value !== "" && value != null) values[f.key] = value;
      }
      const duplicate = existing.find((e) => clean(e[nameKey]) === clean(values[nameKey]) && clean(e.edicion) === clean(values.edicion));
      return { id: index, selected: errors.length === 0, values, errors, duplicate, action: duplicate ? "skip" : "create" };
    });
    setRows(parsed);
  }

  async function save() {
    setSaving(true);
    let created = 0, updated = 0, skipped = 0, rejected = 0;
    for (const row of rows) {
      if (!row.selected || row.errors.length) { rejected++; continue; }
      if (row.action === "skip") { skipped++; continue; }
      const query = row.action === "update" && row.duplicate?.id
        ? db.from(table).update(row.values).eq("id", row.duplicate.id)
        : db.from(table).insert(row.values);
      const { error } = await query;
      if (error) { rejected++; } else if (row.action === "update") updated++; else created++;
    }
    setSaving(false);
    toast.success(`Importación terminada: ${created} creados, ${updated} actualizados, ${skipped} omitidos, ${rejected} rechazados`);
    onImported(); setOpen(false);
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([importFields.map((f) => f.label)]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    XLSX.writeFile(wb, `plantilla-${title.toLowerCase()}.xlsx`);
  }

  const headers = Object.keys(rawRows[0] ?? {});
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><FileSpreadsheet className="mr-1 h-4 w-4"/>Importar Excel/CSV</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader><DialogTitle>Importar {title.toLowerCase()}</DialogTitle></DialogHeader>
        {!rawRows.length ? <div className="grid place-items-center gap-4 rounded-sm border border-dashed border-border py-14">
          <FileSpreadsheet className="h-10 w-10 text-primary"/><p>Selecciona un Excel o CSV para revisar sus datos.</p>
          <div className="flex gap-2"><Button variant="outline" onClick={downloadTemplate}><Download className="mr-1 h-4 w-4"/>Plantilla</Button><Label className="inline-flex cursor-pointer items-center rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground"><Upload className="mr-1 h-4 w-4"/>Elegir archivo<Input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { const f=e.target.files?.[0]; if(f) loadFile(f); }}/></Label></div>
        </div> : <div className="space-y-5">
          {sheetNames.length > 1 && <div className="max-w-xs"><Label>Hoja</Label><Select value={sheet} onValueChange={(v) => { setSheet(v); loadSheet(workbook, v); }}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{sheetNames.map((n)=><SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select></div>}
          {!rows.length ? <><div className="grid gap-3 md:grid-cols-2">{importFields.map((f)=><div key={f.key} className="grid grid-cols-[1fr,1.3fr] items-center gap-2"><Label>{f.label}{f.required?" *":""}</Label><Select value={mapping[f.key] ?? "__none"} onValueChange={(v)=>setMapping((m)=>({...m,[f.key]:v==="__none"?"":v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__none">No importar</SelectItem>{headers.map((h)=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>)}</div><Button onClick={review}>Revisar {rawRows.length} filas</Button></> :
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-muted"><th className="p-2">Incluir</th><th className="p-2 text-left">Nombre</th><th className="p-2 text-left">Edición</th><th className="p-2 text-left">Validación</th><th className="p-2 text-left">Coincidencia</th></tr></thead><tbody className="divide-y divide-border">{rows.map((r)=><tr key={r.id}><td className="p-2"><Checkbox checked={r.selected} onCheckedChange={(v)=>setRows((all)=>all.map((x)=>x.id===r.id?{...x,selected:Boolean(v)}:x))}/></td><td className="p-2 font-medium">{String(r.values[nameKey]??"—")}</td><td className="p-2">{String(r.values.edicion??"—")}</td><td className="p-2">{r.errors.length?<span className="text-destructive">{r.errors.join(" · ")}</span>:"Correcta"}</td><td className="p-2">{r.duplicate?<Select value={r.action} onValueChange={(v:any)=>setRows((all)=>all.map((x)=>x.id===r.id?{...x,action:v}:x))}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="update">Actualizar</SelectItem><SelectItem value="skip">Omitir</SelectItem><SelectItem value="create">Crear como nuevo</SelectItem></SelectContent></Select>:"Nueva"}</td></tr>)}</tbody></table></div>}
        </div>}
        <DialogFooter>{rows.length>0&&<Button onClick={save} disabled={saving}>{saving?"Importando…":`Importar ${rows.filter((r)=>r.selected).length} filas`}</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}