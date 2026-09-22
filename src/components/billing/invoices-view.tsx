import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileUp, Pencil, Plus, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDateEs } from "@/lib/dates";
import { Money } from "@/components/money";
import { ExportRowsButton } from "@/components/export-rows-button";
import { EmptyState } from "@/components/list-states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export type Invoice = {
  id: string; invoice_number: string | null; issue_date: string; period_year: number | null; period_month: number | null;
  production_id: string | null; production_title: string | null; client_name: string | null; representative_name: string | null;
  concept: string | null; amount: number | null; status: string; due_date: string | null; paid_date: string | null;
  pdf_path: string | null; notes: string | null; order_id: string | null;
};

type Draft = {
  invoice_number: string; issue_date: string; production_id: string; client_name: string; representative_name: string;
  concept: string; amount: string; due_date: string; paid_date: string; notes: string;
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const STATUS_LABEL: Record<string, string> = { emitida: "Emitida", cobrada: "Cobrada", anulada: "Anulada" };
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: Draft = { invoice_number: "", issue_date: today(), production_id: "", client_name: "", representative_name: "", concept: "", amount: "", due_date: "", paid_date: "", notes: "" };

function estadoVisible(i: Invoice) {
  if (i.status !== "emitida") return STATUS_LABEL[i.status] ?? i.status;
  if (i.due_date && i.due_date < today()) return "Vencida";
  return "Emitida";
}

export function InvoicesView({ productionFilter }: { productionFilter?: string | null }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const invoicesQ = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("billing_invoices").select("*").order("issue_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
  const productionsQ = useQuery({
    queryKey: ["billing-invoices-productions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("productions").select("id,title").order("title");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string }>;
    },
  });

  const all = invoicesQ.data ?? [];
  const years = useMemo(() => Array.from(new Set(all.map(i => i.issue_date.slice(0, 4)))).sort().reverse(), [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(i => {
      if (productionFilter && i.production_id !== productionFilter) return false;
      if (status !== "all" && i.status !== status) return false;
      if (year !== "all" && i.issue_date.slice(0, 4) !== year) return false;
      if (month !== "all" && i.issue_date.slice(5, 7) !== month) return false;
      if (from && i.issue_date < from) return false;
      if (to && i.issue_date > to) return false;
      if (q && ![i.invoice_number, i.production_title, i.client_name, i.representative_name, i.concept].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, productionFilter, status, year, month, from, to, search]);

  const groups = useMemo(() => {
    const map = new Map<string, Invoice[]>();
    for (const i of rows) {
      const key = i.issue_date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), i]);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  const totals = rows.reduce((a, i) => {
    const amount = Number(i.amount) || 0;
    if (i.status === "anulada") return a;
    a.emitido += amount;
    if (i.status === "cobrada") a.cobrado += amount; else a.pendiente += amount;
    return a;
  }, { emitido: 0, cobrado: 0, pendiente: 0 });

  const save = useMutation({
    mutationFn: async () => {
      const title = productionsQ.data?.find(p => p.id === draft.production_id)?.title ?? null;
      const payload: Record<string, unknown> = {
        invoice_number: draft.invoice_number || null,
        issue_date: draft.issue_date || today(),
        production_id: draft.production_id || null,
        production_title: title,
        client_name: draft.client_name || null,
        representative_name: draft.representative_name || null,
        concept: draft.concept || null,
        amount: draft.amount === "" ? 0 : Number(draft.amount),
        due_date: draft.due_date || null,
        paid_date: draft.paid_date || null,
        notes: draft.notes || null,
        last_edited_by: user?.id ?? null,
      };
      if (draft.paid_date) payload["status"] = "cobrada";
      if (editing) {
        const { error } = await (supabase as any).from("billing_invoices").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("billing_invoices").insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Factura actualizada" : "Factura registrada"); setOpen(false); setEditing(null); setDraft(EMPTY); qc.invalidateQueries({ queryKey: ["billing-invoices"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatusM = useMutation({
    mutationFn: async ({ invoice, next }: { invoice: Invoice; next: "cobrada" | "anulada" }) => {
      const patch: Record<string, unknown> = { status: next, last_edited_by: user?.id ?? null };
      if (next === "cobrada") patch["paid_date"] = invoice.paid_date ?? today();
      const { error } = await (supabase as any).from("billing_invoices").update(patch).eq("id", invoice.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Factura actualizada"); qc.invalidateQueries({ queryKey: ["billing-invoices"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadPdf = useMutation({
    mutationFn: async ({ invoice, file }: { invoice: Invoice; file: File }) => {
      const path = `${invoice.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("billing-invoices").upload(path, file, { upsert: true });
      if (error) throw error;
      const { error: dbError } = await (supabase as any).from("billing_invoices").update({ pdf_path: path }).eq("id", invoice.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => { toast.success("PDF adjuntado"); qc.invalidateQueries({ queryKey: ["billing-invoices"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  async function openPdf(invoice: Invoice) {
    if (!invoice.pdf_path) return;
    const { data, error } = await supabase.storage.from("billing-invoices").createSignedUrl(invoice.pdf_path, 300);
    if (error || !data?.signedUrl) { toast.error("No se pudo abrir el PDF"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  function openNew() { setEditing(null); setDraft({ ...EMPTY, production_id: productionFilter ?? "" }); setOpen(true); }
  function openEdit(i: Invoice) {
    setEditing(i);
    setDraft({
      invoice_number: i.invoice_number ?? "", issue_date: i.issue_date, production_id: i.production_id ?? "",
      client_name: i.client_name ?? "", representative_name: i.representative_name ?? "", concept: i.concept ?? "",
      amount: i.amount == null ? "" : String(i.amount), due_date: i.due_date ?? "", paid_date: i.paid_date ?? "", notes: i.notes ?? "",
    });
    setOpen(true);
  }

  const exportRows = rows.map(i => ({
    Numero: i.invoice_number ?? "—", Fecha: formatDateEs(i.issue_date), Produccion: i.production_title ?? "—",
    Cliente: i.client_name ?? "—", Representado: i.representative_name ?? "—", Concepto: i.concept ?? "—",
    Importe: Number(i.amount) || 0, Estado: estadoVisible(i), Cobro: i.paid_date ? formatDateEs(i.paid_date) : "—",
  }));

  return <div>
    <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Kpi label="Emitido en el periodo" value={<Money value={totals.emitido} />} />
      <Kpi label="Cobrado" value={<Money value={totals.cobrado} />} />
      <Kpi label="Pendiente de cobro" value={<Money value={totals.pendiente} />} />
    </section>

    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Input className="max-w-xs" placeholder="Buscar nº, producción, cliente…" value={search} onChange={e => setSearch(e.target.value)} />
      <select className="h-10 border border-input bg-background px-3" value={year} onChange={e => setYear(e.target.value)}>
        <option value="all">Todos los años</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select className="h-10 border border-input bg-background px-3" value={month} onChange={e => setMonth(e.target.value)}>
        <option value="all">Todos los meses</option>
        {MESES.map((m, idx) => <option key={m} value={String(idx + 1).padStart(2, "0")}>{m}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Desde<Input type="date" className="w-40" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Hasta<Input type="date" className="w-40" value={to} onChange={e => setTo(e.target.value)} /></label>
      <select className="h-10 border border-input bg-background px-3" value={status} onChange={e => setStatus(e.target.value)}>
        <option value="all">Todos los estados</option>
        <option value="emitida">Emitida</option>
        <option value="cobrada">Cobrada</option>
        <option value="anulada">Anulada</option>
      </select>
      <ExportRowsButton rows={exportRows} filename="facturas-ic" sheetName="Facturas" />
      <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nueva factura</Button>
    </div>

    {invoicesQ.isLoading ? <div className="p-10 text-center">Cargando…</div> : rows.length === 0 ? (
      <EmptyState title="Sin facturas en este periodo" description="Registra una factura o marca una orden como facturada para que aparezca aquí." />
    ) : (
      <div className="space-y-8">
        {groups.map(([key, items]) => {
          const [y, m] = key.split("-");
          const subtotal = items.reduce((s, i) => s + (i.status === "anulada" ? 0 : Number(i.amount) || 0), 0);
          return <div key={key}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="font-display text-xl title-caps">{MESES[Number(m) - 1]} {y}</h3>
              <span className="text-sm text-muted-foreground">Total mes: <Money value={subtotal} /></span>
            </div>
            <div className="overflow-x-auto border border-border">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="bg-muted/40 text-left"><tr>
                  <th className="p-3">Nº</th><th className="p-3">Fecha</th><th className="p-3">Producción</th><th className="p-3">Cliente</th>
                  <th className="p-3">Representado</th><th className="p-3">Concepto</th><th className="p-3 text-right">Importe</th>
                  <th className="p-3">Estado</th><th className="p-3">Cobro</th><th className="p-3">PDF</th><th className="p-3"></th>
                </tr></thead>
                <tbody>{items.map(i => <tr key={i.id} className="border-t border-border">
                  <td className="p-3 font-mono">{i.invoice_number || "Sin nº"}</td>
                  <td className="p-3">{formatDateEs(i.issue_date)}</td>
                  <td className="p-3 font-display">{i.production_title || "—"}</td>
                  <td className="p-3">{i.client_name || "—"}</td>
                  <td className="p-3">{i.representative_name || "—"}</td>
                  <td className="p-3">{i.concept || "—"}</td>
                  <td className="p-3 text-right"><Money value={Number(i.amount) || 0} /></td>
                  <td className="p-3">{estadoVisible(i)}</td>
                  <td className="p-3">{i.paid_date ? formatDateEs(i.paid_date) : "—"}</td>
                  <td className="p-3">
                    {i.pdf_path ? <Button size="sm" variant="ghost" onClick={() => openPdf(i)}><Download className="mr-1 h-4 w-4" />Ver</Button> : (
                      <label className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground">
                        <FileUp className="h-4 w-4" />Subir
                        <input type="file" accept="application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPdf.mutate({ invoice: i, file: f }); }} />
                      </label>
                    )}
                  </td>
                  <td className="p-3"><div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    {i.status === "emitida" && <Button size="sm" variant="outline" onClick={() => setStatusM.mutate({ invoice: i, next: "cobrada" })}><CheckCircle2 className="mr-1 h-4 w-4" />Cobrada</Button>}
                    {i.status !== "anulada" && <Button size="icon" variant="ghost" title="Anular" onClick={() => setStatusM.mutate({ invoice: i, next: "anulada" })}><XCircle className="h-4 w-4" /></Button>}
                  </div></td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>;
        })}
      </div>
    )}

    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setEditing(null); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Editar factura" : "Nueva factura"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nº de factura"><Input value={draft.invoice_number} onChange={e => setDraft({ ...draft, invoice_number: e.target.value })} /></Field>
          <Field label="Fecha de emisión"><Input type="date" value={draft.issue_date} onChange={e => setDraft({ ...draft, issue_date: e.target.value })} /></Field>
          <Field label="Producción">
            <select className="h-10 w-full border border-input bg-background px-3" value={draft.production_id} onChange={e => setDraft({ ...draft, production_id: e.target.value })}>
              <option value="">Sin producción asignada</option>
              {(productionsQ.data ?? []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Field>
          <Field label="Cliente"><Input value={draft.client_name} onChange={e => setDraft({ ...draft, client_name: e.target.value })} /></Field>
          <Field label="Representado"><Input value={draft.representative_name} onChange={e => setDraft({ ...draft, representative_name: e.target.value })} /></Field>
          <Field label="Importe (€)"><Input type="number" step="0.01" value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value })} /></Field>
          <Field label="Vencimiento"><Input type="date" value={draft.due_date} onChange={e => setDraft({ ...draft, due_date: e.target.value })} /></Field>
          <Field label="Fecha de cobro"><Input type="date" value={draft.paid_date} onChange={e => setDraft({ ...draft, paid_date: e.target.value })} /></Field>
          <div className="col-span-2"><Field label="Concepto"><Input value={draft.concept} onChange={e => setDraft({ ...draft, concept: e.target.value })} /></Field></div>
          <div className="col-span-2"><Field label="Notas"><Textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></Field></div>
        </div>
        {!draft.production_id && <p className="text-sm text-muted-foreground">Esta factura quedará sin producción asociada.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-muted-foreground">{label}</span>{children}</label>;
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="border border-border p-4"><p className="smallcaps text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl">{value}</p></div>;
}
