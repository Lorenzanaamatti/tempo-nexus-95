import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { toast } from "sonner";
import { Plus, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateEs } from "@/lib/dates";

const db = supabase as any;

export type DeadlineField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "url" | "select" | "composer" | "production" | "institucion";
  options?: readonly string[];
  required?: boolean;
  full?: boolean;
};

export type DeadlineColumn = { key: string; label: string; type?: "date" | "money" | "text" };

type Row = Record<string, any>;

function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function DeadlineOpportunities({
  table,
  title,
  description,
  nameKey,
  deadlineKey,
  deadlineLabel,
  estados,
  fields,
  columns,
  newLabel,
}: {
  table: string;
  title: string;
  description: string;
  nameKey: string;
  deadlineKey: string;
  deadlineLabel: string;
  estados: readonly string[];
  fields: DeadlineField[];
  columns: DeadlineColumn[];
  newLabel: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  const listQ = useQuery({
    queryKey: [table, "list"],
    queryFn: async () => {
      const { data, error } = await db.from(table).select("*").order(deadlineKey, { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (listQ.data ?? [])
      .filter((r) => estado === "todos" || r.estado === estado)
      .filter((r) => !needle || String(r[nameKey] ?? "").toLowerCase().includes(needle));
  }, [listQ.data, q, estado, nameKey]);

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(row: Row) { setEditing(row); setOpen(true); }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Oportunidades de ventas</p>
          <h1 className="mt-1 font-display text-5xl title-caps">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-56 rounded-sm" />
          <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> {newLabel}</Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["todos", ...estados].map((e) => {
          const active = estado === e;
          const count = e === "todos" ? (listQ.data ?? []).length : (listQ.data ?? []).filter((r) => r.estado === e).length;
          return (
            <button
              key={e}
              type="button"
              onClick={() => setEstado(e)}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-xs smallcaps transition",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
              )}
            >
              {e === "todos" ? "Todos" : e} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {listQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : !rows.length ? (
        q || estado !== "todos" ? (
          <EmptyState
            variant="filtered"
            title="Ningún resultado"
            description="Ningún registro coincide con los filtros actuales."
            action={{ label: "Limpiar filtros", onClick: () => { setQ(""); setEstado("todos"); } }}
          />
        ) : (
          <EmptyState icon={CalendarClock} title="Sin registros" description={`Añade la primera entrada con ${newLabel.toLowerCase()}.`} />
        )
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {columns.map((c) => <th key={c.key} className="px-3 py-2 smallcaps text-xs">{c.label}</th>)}
                <th className="px-3 py-2 smallcaps text-xs">{deadlineLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const d = daysUntil(r[deadlineKey]);
                return (
                  <tr key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openEdit(r)}>
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-3 py-2", c.key === nameKey ? "font-display" : "text-muted-foreground")}>
                        {c.type === "date"
                          ? formatDateEs(r[c.key])
                          : c.type === "money"
                            ? (r[c.key] != null ? `${Number(r[c.key]).toLocaleString("es-ES")} €` : "—")
                            : (r[c.key] || "—")}
                      </td>
                    ))}
                    <td className="px-3 py-2 tabular-nums">
                      <span className="mr-2">{formatDateEs(r[deadlineKey])}</span>
                      {d != null && d >= 0 && d <= 30 && (
                        <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] smallcaps text-primary-foreground">
                          {d} días
                        </span>
                      )}
                      {d != null && d < 0 && (
                        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] smallcaps text-muted-foreground">Cerrado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
        onSaved={() => qc.invalidateQueries({ queryKey: [table, "list"] })}
      />
    </div>
  );
}

function useLookups() {
  const composersQ = useQuery({
    queryKey: ["lookup-composers"],
    queryFn: async () => {
      const { data, error } = await db.from("composers").select("id, full_name").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
  const productionsQ = useQuery({
    queryKey: ["lookup-productions"],
    queryFn: async () => {
      const { data, error } = await db.from("productions").select("id, title").order("title");
      if (error) throw error;
      return (data ?? []) as { id: string; title: string }[];
    },
  });
  const institucionesQ = useQuery({
    queryKey: ["lookup-partners-institucion"],
    queryFn: async () => {
      const { data, error } = await db.from("partners").select("id, nombre").order("nombre");
      if (error) throw error;
      return (data ?? []) as { id: string; nombre: string }[];
    },
  });
  return { composersQ, productionsQ, institucionesQ };
}

function RecordDialog({
  table, open, onOpenChange, fields, record, title, onSaved,
}: {
  table: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fields: DeadlineField[];
  record: Row | null;
  title: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Row>(record ?? {});
  const [saving, setSaving] = useState(false);
  const { composersQ, productionsQ, institucionesQ } = useLookups();

  useEffect(() => { setForm(record ?? {}); }, [record]);

  function set(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    const missing = fields.filter((f) => f.required && !form[f.key]);
    if (missing.length) return toast.error(`Falta: ${missing.map((m) => m.label).join(", ")}`);
    setSaving(true);
    const payload: Row = {};
    for (const f of fields) {
      const v = form[f.key];
      payload[f.key] = v === "" || v === undefined ? null : f.type === "number" ? Number(v) : v;
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
    const { error } = await db.from(table).delete().eq("id", record.id);
    if (error) return toast.error(error.message);
    toast.success("Registro eliminado");
    onOpenChange(false);
    onSaved();
  }

  function renderField(f: DeadlineField) {
    const value = form[f.key] ?? "";
    if (f.type === "textarea") return <Textarea rows={3} value={value} onChange={(e) => set(f.key, e.target.value)} />;
    if (f.type === "date") return <Input type="date" value={value ?? ""} onChange={(e) => set(f.key, e.target.value)} />;
    if (f.type === "number") return <Input type="number" value={value ?? ""} onChange={(e) => set(f.key, e.target.value)} />;
    if (f.type === "select") {
      return (
        <Select value={value || ""} onValueChange={(v) => set(f.key, v)}>
          <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
          <SelectContent>{(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    if (f.type === "composer" || f.type === "production" || f.type === "institucion") {
      const items =
        f.type === "composer"
          ? (composersQ.data ?? []).map((c) => ({ id: c.id, label: c.full_name }))
          : f.type === "production"
            ? (productionsQ.data ?? []).map((p) => ({ id: p.id, label: p.title }))
            : (institucionesQ.data ?? []).map((p) => ({ id: p.id, label: p.nombre }));
      return (
        <Select value={value || ""} onValueChange={(v) => set(f.key, v === "__none" ? null : v)}>
          <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Sin asignar</SelectItem>
            {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return <Input value={value ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.type === "url" ? "https://" : undefined} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key} className={cn("grid gap-1.5", f.full && "col-span-2")}>
              <Label>{f.label}{f.required && " *"}</Label>
              {renderField(f)}
            </div>
          ))}
        </div>
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          {record?.id ? (
            <Button variant="ghost" className="text-destructive" onClick={remove}>Eliminar</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}