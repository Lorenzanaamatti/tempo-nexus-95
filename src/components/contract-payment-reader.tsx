import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leerPlazosContrato, type LecturaContrato, type PlazoSugerido } from "@/lib/contract-reader.functions";
import { formatEUR } from "@/lib/money";

async function toBase64(file: File) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Lee un contrato o deal memo con IA, propone los plazos de pago y, tras
 * revisión humana, los crea como plazos de facturación de la producción.
 * Nunca escribe nada sin confirmación y no modifica plazos existentes.
 */
export function ContractPaymentReader({
  contractId,
  defaultProductionId,
  storagePath,
}: {
  contractId: string;
  defaultProductionId?: string | null;
  storagePath?: string | null;
}) {
  const qc = useQueryClient();
  const leer = useServerFn(leerPlazosContrato);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LecturaContrato | null>(null);
  const [rows, setRows] = useState<PlazoSugerido[]>([]);
  const [productionId, setProductionId] = useState(defaultProductionId ?? "");
  const [saving, setSaving] = useState(false);

  const prodsQ = useQuery({
    queryKey: ["productions-mini-open"],
    queryFn: async () => {
      const { data } = await supabase.from("productions").select("id, title, year").order("title");
      return data ?? [];
    },
  });

  async function analyze(file: File | Blob, name: string) {
    setLoading(true);
    try {
      const fileBase64 = await toBase64(file as File);
      const r = await leer({ data: { fileBase64, filename: name } });
      setResult(r);
      setRows(r.plazos);
      if (!r.plazos.length) toast.message("No se han encontrado plazos de pago en el documento");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo leer el contrato");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeStored() {
    if (!storagePath) return;
    const { data, error } = await supabase.storage.from("contracts").download(storagePath);
    if (error || !data) return toast.error("No se pudo abrir el documento guardado. Súbelo aquí.");
    await analyze(data, storagePath.split("/").pop() || "contrato.pdf");
  }

  function update(i: number, patch: Partial<PlazoSugerido>) {
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  }

  async function confirm() {
    if (!productionId) return toast.error("Elige la producción a la que pertenecen estos pagos");
    if (!rows.length) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from("production_billing_sprints")
      .select("sprint_number")
      .eq("production_id", productionId)
      .eq("kind", "trabajo")
      .order("sprint_number", { ascending: false })
      .limit(1);
    let n = (existing?.[0]?.sprint_number ?? 0) as number;
    const payload = rows.map((r) => ({
      production_id: productionId,
      contract_id: contractId,
      kind: "trabajo" as const,
      sprint_number: ++n,
      label: r.label,
      concept: r.trigger || r.label,
      amount: r.amount,
      due_date: r.due_date,
      planned_invoice_date: r.due_date,
      status: "pendiente" as const,
      notes: r.quote ? `Leído del contrato: «${r.quote}»` : null,
    }));
    const { error } = await supabase.from("production_billing_sprints").insert(payload as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${payload.length} plazos añadidos al calendario de facturación`);
    setResult(null);
    setRows([]);
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-4 rounded-sm border border-border p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">Leer plazos de pago con IA</p>
          <p className="text-xs text-muted-foreground">
            Sube el contrato o deal memo en PDF. La app propone los plazos; tú los revisas y confirmas antes de que pasen a facturación.
          </p>
        </div>
        {storagePath && (
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={analyzeStored}>
            Usar el documento guardado
          </Button>
        )}
        <label className="inline-flex cursor-pointer items-center rounded-sm border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/10">
          {loading ? "Leyendo…" : "Subir PDF"}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) analyze(f, f.name);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {result && (
        <div className="space-y-3">
          <p className="text-sm">
            Importe total detectado: <strong>{result.total != null ? formatEUR(result.total) : "no indicado"}</strong>
            {result.notas && <span className="block text-xs text-muted-foreground">{result.notas}</span>}
          </p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-sm border border-border p-3 sm:grid-cols-[1fr_90px_140px_150px_auto]">
                <div>
                  <Input value={r.label} onChange={(e) => update(i, { label: e.target.value })} />
                  <p className="mt-1 text-[11px] text-muted-foreground">{r.trigger}{r.quote ? ` — «${r.quote}»` : ""}</p>
                </div>
                <Input
                  type="number"
                  placeholder="%"
                  value={r.pct ?? ""}
                  onChange={(e) => {
                    const pct = e.target.value === "" ? null : Number(e.target.value);
                    update(i, { pct, amount: pct != null && result.total ? Math.round(result.total * pct) / 100 : r.amount });
                  }}
                />
                <Input type="number" placeholder="Importe €" value={r.amount ?? ""} onChange={(e) => update(i, { amount: e.target.value === "" ? null : Number(e.target.value) })} />
                <Input type="date" value={r.due_date ?? ""} onChange={(e) => update(i, { due_date: e.target.value || null })} title="Fecha prevista de factura" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, k) => k !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, { label: "Nuevo plazo", trigger: "", pct: null, amount: null, due_date: null, quote: "" }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Añadir plazo
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <Select value={productionId} onValueChange={setProductionId}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Producción" /></SelectTrigger>
              <SelectContent>
                {(prodsQ.data ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}{p.year ? ` (${p.year})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Los plazos sin fecha se completan cuando se conozca la entrega.</span>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" onClick={() => { setResult(null); setRows([]); }}>Descartar</Button>
              <Button type="button" disabled={saving || !rows.length} onClick={confirm}>
                {saving ? "Guardando…" : "Confirmar y calendarizar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
