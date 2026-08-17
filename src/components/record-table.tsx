import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateEs } from "@/lib/dates";

const db = supabase as any;

export type Option = { value: string; label: string };
export type RecordField = {
  key: string;
  label: string;
  type:
    | "text" | "textarea" | "richtext" | "date" | "number" | "money" | "url"
    | "select" | "multiselect" | "boolean" | "composer" | "production";
  options?: Option[];
  required?: boolean;
  full?: boolean;
  /** Solo se muestra si esta función devuelve true. */
  visible?: (form: Record<string, any>) => boolean;
};
export type RecordColumn = {
  key: string;
  label: string;
  type?: "date" | "money" | "text" | "boolean" | "tags" | "badge";
  options?: Option[];
};

export type RecordRow = Record<string, any>;

function labelOf(options: Option[] | undefined, value: any) {
  if (value === null || value === undefined || value === "") return "—";
  return options?.find((o) => o.value === value)?.label ?? String(value);
}

export function RecordTable({
  table, kicker, title, description, newLabel, columns, fields,
  orderBy = "created_at", ascending = false, searchKey, filters = [], select = "*",
  extraHeader, onRowClick, emptyDescription,
}: {
  table: string;
  kicker: string;
  title: string;
  description: string;
  newLabel: string;
  columns: RecordColumn[];
  fields: RecordField[];
  orderBy?: string;
  ascending?: boolean;
  searchKey?: string;
  /** Filtros por columna con opciones fijas. */
  filters?: { key: string; label: string; options: Option[] }[];
  select?: string;
  extraHeader?: React.ReactNode;
  onRowClick?: (row: RecordRow) => void;
  emptyDescription?: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [open, setOpen] = useState(false);

  const listQ = useQuery({
    queryKey: [table, "record-list"],
    queryFn: async () => {
      const { data, error } = await db.from(table).select(select).order(orderBy, { ascending });
      if (error) throw error;
      return (data ?? []) as RecordRow[];
    },
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (listQ.data ?? [])
      .filter((r) => Object.entries(active).every(([k, v]) => !v || v === "todos" || String(r[k]) === v))
      .filter((r) => !needle || !searchKey || String(r[searchKey] ?? "").toLowerCase().includes(needle));
  }, [listQ.data, q, active, searchKey]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">{kicker}</p>
          <h1 className="mt-1 font-display text-5xl title-caps">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {searchKey && (
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-56 rounded-sm" />
          )}
          {filters.map((f) => (
            <Select
              key={f.key}
              value={active[f.key] ?? "todos"}
              onValueChange={(v) => setActive((p) => ({ ...p, [f.key]: v }))}
            >
              <SelectTrigger className="w-48"><SelectValue placeholder={f.label} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{f.label}: todos</SelectItem>
                {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> {newLabel}
          </Button>
        </div>
      </div>

      {extraHeader}

      {listQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : !rows.length ? (
        <EmptyState
          title="Sin registros"
          description={emptyDescription ?? `Añade la primera entrada con «${newLabel}».`}
          action={{ label: newLabel, onClick: () => { setEditing(null); setOpen(true); } }}
        />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>{columns.map((c) => <th key={c.key} className="px-3 py-2 smallcaps text-xs">{c.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => (onRowClick ? onRowClick(r) : (setEditing(r), setOpen(true)))}
                >
                  {columns.map((c, i) => (
                    <td key={c.key} className={cn("px-3 py-2 align-top", i === 0 ? "font-display" : "text-muted-foreground")}>
                      <CellValue col={c} value={r[c.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecordDialog
        key={editing?.id ?? "new"}
        table={table}
        open={open}
        onOpenChange={setOpen}
        fields={fields}
        record={editing}
        title={editing ? "Editar registro" : newLabel}
        onSaved={() => qc.invalidateQueries({ queryKey: [table, "record-list"] })}
      />
    </div>
  );
}

function CellValue({ col, value }: { col: RecordColumn; value: any }) {
  if (col.type === "date") return <>{formatDateEs(value)}</>;
  if (col.type === "money") return <>{value != null ? `${Number(value).toLocaleString("es-ES")} €` : "—"}</>;
  if (col.type === "boolean") return <>{value ? "Sí" : "No"}</>;
  if (col.type === "tags") {
    const arr = Array.isArray(value) ? value : [];
    if (!arr.length) return <>—</>;
    return (
      <span className="flex flex-wrap gap-1">
        {arr.map((v) => (
          <Badge key={String(v)} variant="outline" className="rounded-sm text-[10px]">{labelOf(col.options, v)}</Badge>
        ))}
      </span>
    );
  }
  if (col.type === "badge") {
    if (!value) return <>—</>;
    return <Badge variant="outline" className="rounded-sm text-[10px]">{labelOf(col.options, value)}</Badge>;
  }
  if (col.options) return <>{labelOf(col.options, value)}</>;
  return <>{value === null || value === undefined || value === "" ? "—" : String(value)}</>;
}

export function useLookupComposers() {
  return useQuery({
    queryKey: ["lookup-composers"],
    queryFn: async () => {
      const { data, error } = await db.from("composers").select("id, full_name").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
}

function RecordDialog({
  table, open, onOpenChange, fields, record, title, onSaved,
}: {
  table: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fields: RecordField[];
  record: RecordRow | null;
  title: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RecordRow>(record ?? {});
  const [saving, setSaving] = useState(false);
  const composersQ = useLookupComposers();
  const productionsQ = useQuery({
    queryKey: ["lookup-productions"],
    queryFn: async () => {
      const { data, error } = await db.from("productions").select("id, title").order("title");
      if (error) throw error;
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  useEffect(() => { setForm(record ?? {}); }, [record]);
  const set = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  async function save() {
    const visible = fields.filter((f) => !f.visible || f.visible(form));
    const missing = visible.filter((f) => f.required && !form[f.key]);
    if (missing.length) return toast.error(`Falta: ${missing.map((m) => m.label).join(", ")}`);
    setSaving(true);
    const payload: RecordRow = {};
    for (const f of fields) {
      const v = form[f.key];
      if (f.type === "multiselect") payload[f.key] = Array.isArray(v) ? v : [];
      else if (f.type === "boolean") payload[f.key] = !!v;
      else if (f.type === "number" || f.type === "money") payload[f.key] = v === "" || v == null ? null : Number(v);
      else payload[f.key] = v === "" || v === undefined ? null : v;
    }
    const { error } = record?.id
      ? await db.from(table).update(payload).eq("id", record.id)
      : await db.from(table).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(record?.id ? "Registro actualizado" : "Registro creado");
    onOpenChange(false);
    onSaved();
  }

  async function remove() {
    if (!record?.id) return;
    if (!confirm("¿Eliminar este registro?")) return;
    const { error } = await db.from(table).delete().eq("id", record.id);
    if (error) return toast.error(error.message);
    toast.success("Registro eliminado");
    onOpenChange(false);
    onSaved();
  }

  function renderField(f: RecordField) {
    const value = form[f.key] ?? "";
    switch (f.type) {
      case "textarea":
      case "richtext":
        return <Textarea rows={f.type === "richtext" ? 12 : 3} value={value} onChange={(e) => set(f.key, e.target.value)} className={f.type === "richtext" ? "font-mono text-xs" : undefined} />;
      case "date":
        return <Input type="date" value={value ?? ""} onChange={(e) => set(f.key, e.target.value)} />;
      case "number":
      case "money":
        return <Input type="number" value={value ?? ""} onChange={(e) => set(f.key, e.target.value)} />;
      case "boolean":
        return (
          <div className="flex h-9 items-center">
            <Switch checked={!!form[f.key]} onCheckedChange={(v) => set(f.key, v)} />
          </div>
        );
      case "select":
        return (
          <Select value={value || ""} onValueChange={(v) => set(f.key, v)}>
            <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
            <SelectContent>{(f.options ?? []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        );
      case "multiselect": {
        const arr: string[] = Array.isArray(form[f.key]) ? form[f.key] : [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {(f.options ?? []).map((o) => {
              const on = arr.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set(f.key, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                  className={cn(
                    "rounded-sm border px-2 py-1 text-xs transition",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        );
      }
      case "composer":
      case "production": {
        const items = f.type === "composer"
          ? (composersQ.data ?? []).map((c) => ({ value: c.id, label: c.full_name }))
          : (productionsQ.data ?? []).map((p) => ({ value: p.id, label: p.title }));
        return (
          <Select value={value || "__none"} onValueChange={(v) => set(f.key, v === "__none" ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__none">Sin asignar</SelectItem>
              {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      }
      default:
        return <Input value={value ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.type === "url" ? "https://" : undefined} />;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {fields.filter((f) => !f.visible || f.visible(form)).map((f) => (
            <div key={f.key} className={cn("grid gap-1.5", f.full && "col-span-2")}>
              <Label>{f.label}{f.required && " *"}</Label>
              {renderField(f)}
            </div>
          ))}
        </div>
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          {record?.id ? <Button variant="ghost" className="text-destructive" onClick={remove}>Eliminar</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
