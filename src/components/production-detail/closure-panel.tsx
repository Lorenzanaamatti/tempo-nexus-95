import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { uploadToBucket } from "@/lib/storage-upload";
import { cn } from "@/lib/utils";
import { FileText, Plus, Trash2 } from "lucide-react";

const db = supabase as any;

export type ClosureRow = Record<string, any>;

export const CUE_USOS = ["Main title", "Score", "Source", "End title", "Otro"] as const;

export const CLOSURE_ITEM_KEYS = [
  "presupuesto_ok",
  "deal_memo_ok",
  "contrato_ok",
  "cue_sheet_ok",
  "entregables_ok",
  "documento_cierre_ok",
] as const;

export function isClosureComplete(row: ClosureRow | null | undefined) {
  if (!row) return false;
  return CLOSURE_ITEM_KEYS.every((k) => Boolean(row[k]));
}

export function useClosure(productionId: string) {
  return useQuery({
    queryKey: ["production-closure", productionId],
    queryFn: async () => {
      const { data, error } = await db.from("production_closures").select("*").eq("production_id", productionId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as ClosureRow | null;
    },
  });
}

function useClosureLookups(productionId: string) {
  const memosQ = useQuery({
    queryKey: ["closure-deal-memos"],
    queryFn: async () => {
      const { data, error } = await db.from("deal_memos").select("id, referencia, obra, production_id").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const contractsQ = useQuery({
    queryKey: ["closure-contracts"],
    queryFn: async () => {
      const { data, error } = await db.from("contracts").select("id, title, production_id, sign_status").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const docsQ = useQuery({
    queryKey: ["closure-production-documents", productionId],
    queryFn: async () => {
      const { data, error } = await db.from("production_documents").select("id, title, kind").eq("production_id", productionId);
      if (error) throw error;
      return data ?? [];
    },
  });
  return { memosQ, contractsQ, docsQ };
}

export function ProductionClosurePanel({
  productionId,
  productionTitle,
  stage,
  isBigC,
  compact,
}: {
  productionId: string;
  productionTitle: string;
  stage: string;
  isBigC: boolean;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const closureQ = useClosure(productionId);
  const { memosQ, contractsQ, docsQ } = useClosureLookups(productionId);
  const [form, setForm] = useState<ClosureRow>({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setForm(closureQ.data ?? { production_id: productionId, cue_sheet_temas: [] });
  }, [closureQ.data, productionId]);

  const temas: any[] = Array.isArray(form.cue_sheet_temas) ? form.cue_sheet_temas : [];
  const canGenerate = stage === "entrega" || stage === "revision" || stage === "finalizada";
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const memos = useMemo(
    () => (memosQ.data ?? []).filter((m: any) => !m.production_id || m.production_id === productionId),
    [memosQ.data, productionId],
  );
  const contracts = useMemo(
    () => (contractsQ.data ?? []).filter((c: any) => !c.production_id || c.production_id === productionId),
    [contractsQ.data, productionId],
  );

  async function persist(extra?: ClosureRow) {
    const payload = {
      production_id: productionId,
      presupuesto_ok: !!form.presupuesto_ok,
      presupuesto_documento_id: form.presupuesto_documento_id || null,
      deal_memo_ok: !!form.deal_memo_ok,
      deal_memo_id: form.deal_memo_id || null,
      contrato_ok: !!form.contrato_ok,
      contrato_id: form.contrato_id || null,
      cue_sheet_ok: !!form.cue_sheet_ok,
      cue_sheet_enviada_a: form.cue_sheet_enviada_a || null,
      cue_sheet_fecha_envio: form.cue_sheet_fecha_envio || null,
      cue_sheet_storage_path: form.cue_sheet_storage_path || null,
      entregables_ok: !!form.entregables_ok,
      entregables_descripcion: form.entregables_descripcion || null,
      entregables_fecha: form.entregables_fecha || null,
      documento_cierre_ok: !!form.documento_cierre_ok,
      documento_cierre_id: form.documento_cierre_id || null,
      cue_sheet_temas: temas,
      derechos_concedidos: form.derechos_concedidos || null,
      honorarios_finales: form.honorarios_finales === "" || form.honorarios_finales == null ? null : Number(form.honorarios_finales),
      notas_internas: form.notas_internas || null,
      ...extra,
    };
    const { error } = await db.from("production_closures").upsert(payload, { onConflict: "production_id" });
    if (error) throw new Error(error.message);
    await qc.invalidateQueries({ queryKey: ["production-closure", productionId] });
  }

  async function save() {
    setSaving(true);
    try {
      await persist();
      toast.success("Checklist de cierre guardado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function generateDocument() {
    setGenerating(true);
    try {
      const memo = memos.find((m: any) => m.id === form.deal_memo_id);
      const contract = contracts.find((c: any) => c.id === form.contrato_id);
      const lines = [
        `DOCUMENTO DE CIERRE — ${productionTitle}`,
        "",
        "DATOS DEL PROYECTO",
        `Producción: ${productionTitle}`,
        `Estado: ${stage}`,
        "",
        "DOCUMENTOS VINCULADOS",
        `Presupuesto: ${form.presupuesto_documento_id ? "vinculado" : "sin presupuesto vinculado"}`,
        `Deal memo: ${memo ? `${memo.referencia ?? ""} ${memo.obra ?? ""}`.trim() : "sin deal memo vinculado"}`,
        `Contrato: ${contract ? contract.title : "sin contrato vinculado"}`,
        "",
        "ENTREGABLES",
        form.entregables_descripcion || "—",
        `Fecha de entrega: ${form.entregables_fecha || "—"}`,
        "",
        "MUSIC CUE SHEET",
        ...(temas.length
          ? temas.map((t: any, i: number) => `${i + 1}. ${t.titulo ?? "—"} · ${t.duracion ?? "—"} · ${t.uso ?? "—"} · ${t.derechos ?? "—"}`)
          : ["—"]),
        "",
        "DERECHOS CONCEDIDOS",
        form.derechos_concedidos || "—",
        "",
        "HONORARIOS FINALES",
        form.honorarios_finales != null && form.honorarios_finales !== "" ? `${form.honorarios_finales} €` : "—",
        ...(isBigC && form.notas_internas ? ["", "NOTAS INTERNAS (BIG C)", form.notas_internas] : []),
      ];
      const { data, error } = await db
        .from("documents")
        .insert({
          subject_type: "production",
          subject_id: productionId,
          title: `Cierre — ${productionTitle}`,
          kind: "Cierre",
          notes: lines.join("\n"),
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "No se pudo generar el documento");
      await persist({ documento_cierre_id: data.id });
      setForm((p) => ({ ...p, documento_cierre_id: data.id }));
      toast.success("Documento de cierre generado y guardado en Paperwork");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  }

  const hint = (text: string) => <p className="text-xs text-muted-foreground">{text}</p>;

  return (
    <div className={cn("space-y-6", compact && "max-h-[60vh] overflow-y-auto pr-1")}>
      {/* 1 Presupuesto */}
      <Item
        checked={!!form.presupuesto_ok}
        onCheckedChange={(v) => set("presupuesto_ok", v)}
        label="Presupuesto aprobado y archivado"
      >
        <Select value={form.presupuesto_documento_id ?? "__none"} onValueChange={(v) => set("presupuesto_documento_id", v === "__none" ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Vincular presupuesto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Sin vincular</SelectItem>
            {(docsQ.data ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.title || d.kind || "Documento"}</SelectItem>)}
          </SelectContent>
        </Select>
        {!form.presupuesto_documento_id && hint("Sin presupuesto vinculado")}
      </Item>

      {/* 2 Deal memo */}
      <Item checked={!!form.deal_memo_ok} onCheckedChange={(v) => set("deal_memo_ok", v)} label="Deal memo firmado">
        <Select value={form.deal_memo_id ?? "__none"} onValueChange={(v) => set("deal_memo_id", v === "__none" ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Vincular deal memo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Sin vincular</SelectItem>
            {memos.map((m: any) => <SelectItem key={m.id} value={m.id}>{`${m.referencia ?? ""} ${m.obra ?? ""}`.trim() || "Deal memo"}</SelectItem>)}
          </SelectContent>
        </Select>
        {!form.deal_memo_id && hint("Sin deal memo vinculado")}
      </Item>

      {/* 3 Contrato */}
      <Item checked={!!form.contrato_ok} onCheckedChange={(v) => set("contrato_ok", v)} label="Contrato firmado">
        <Select value={form.contrato_id ?? "__none"} onValueChange={(v) => set("contrato_id", v === "__none" ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Vincular contrato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Sin vincular</SelectItem>
            {contracts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title || "Contrato"}</SelectItem>)}
          </SelectContent>
        </Select>
        {!form.contrato_id && hint("Sin contrato vinculado")}
      </Item>

      {/* 4 Cue sheet */}
      <Item checked={!!form.cue_sheet_ok} onCheckedChange={(v) => set("cue_sheet_ok", v)} label="Music cue sheet generada y enviada">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Enviada a</Label>
            <Input value={form.cue_sheet_enviada_a ?? ""} onChange={(e) => set("cue_sheet_enviada_a", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Fecha de envío</Label>
            <Input type="date" value={form.cue_sheet_fecha_envio ?? ""} onChange={(e) => set("cue_sheet_fecha_envio", e.target.value)} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>PDF de la cue sheet (opcional)</Label>
            <CueSheetUpload
              productionId={productionId}
              path={form.cue_sheet_storage_path ?? null}
              onUploaded={(p) => set("cue_sheet_storage_path", p)}
            />
          </div>
        </div>
      </Item>

      {/* 5 Entregables */}
      <Item checked={!!form.entregables_ok} onCheckedChange={(v) => set("entregables_ok", v)} label="Entregables musicales entregados">
        <div className="grid gap-3">
          <Textarea
            rows={3}
            placeholder="Descripción de entregables"
            value={form.entregables_descripcion ?? ""}
            onChange={(e) => set("entregables_descripcion", e.target.value)}
          />
          <div className="grid gap-1.5 sm:w-64">
            <Label>Fecha de entrega</Label>
            <Input type="date" value={form.entregables_fecha ?? ""} onChange={(e) => set("entregables_fecha", e.target.value)} />
          </div>
        </div>
      </Item>

      {/* 6 Documento de cierre */}
      <Item
        checked={!!form.documento_cierre_ok}
        disabled={!form.documento_cierre_id}
        onCheckedChange={(v) => set("documento_cierre_ok", v)}
        label="Documento de cierre generado"
      >
        {form.documento_cierre_id ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Documento guardado en Paperwork (tipo «Cierre»).
          </p>
        ) : (
          hint("Genera el documento de cierre para poder marcar este ítem.")
        )}
      </Item>

      {/* Contenido del documento */}
      {canGenerate && (
        <div className="space-y-4 rounded-sm border border-border p-4">
          <p className="smallcaps text-xs text-muted-foreground">Contenido del documento de cierre</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Honorarios finales (€)</Label>
              <Input type="number" value={form.honorarios_finales ?? ""} onChange={(e) => set("honorarios_finales", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Derechos concedidos</Label>
              <Input value={form.derechos_concedidos ?? ""} onChange={(e) => set("derechos_concedidos", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Music cue sheet — temas</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => set("cue_sheet_temas", [...temas, { titulo: "", duracion: "", uso: "Score", derechos: "" }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Añadir tema
              </Button>
            </div>
            {temas.map((t: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_90px_140px_1fr_auto] items-center gap-2">
                <Input placeholder="Título" value={t.titulo ?? ""} onChange={(e) => {
                  const next = [...temas]; next[i] = { ...t, titulo: e.target.value }; set("cue_sheet_temas", next);
                }} />
                <Input placeholder="0:00" value={t.duracion ?? ""} onChange={(e) => {
                  const next = [...temas]; next[i] = { ...t, duracion: e.target.value }; set("cue_sheet_temas", next);
                }} />
                <Select value={t.uso ?? "Score"} onValueChange={(v) => {
                  const next = [...temas]; next[i] = { ...t, uso: v }; set("cue_sheet_temas", next);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CUE_USOS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Derechos" value={t.derechos ?? ""} onChange={(e) => {
                  const next = [...temas]; next[i] = { ...t, derechos: e.target.value }; set("cue_sheet_temas", next);
                }} />
                <Button type="button" variant="ghost" size="icon" onClick={() => set("cue_sheet_temas", temas.filter((_: any, j: number) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {isBigC && (
            <div className="grid gap-1.5">
              <Label>Notas internas (solo BIG C)</Label>
              <Textarea rows={3} value={form.notas_internas ?? ""} onChange={(e) => set("notas_internas", e.target.value)} />
            </div>
          )}

          <Button type="button" variant="outline" onClick={generateDocument} disabled={generating}>
            <FileText className="mr-1 h-4 w-4" /> Generar documento de cierre
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>Guardar checklist</Button>
      </div>
    </div>
  );
}

function Item({
  label, checked, onCheckedChange, disabled, children,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-border p-4">
      <label className="flex items-center gap-2">
        <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onCheckedChange(Boolean(v))} />
        <span className="font-display text-sm">{label}</span>
      </label>
      {children && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function CueSheetUpload({
  productionId, path, onUploaded,
}: { productionId: string; path: string | null; onUploaded: (path: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <Input
        type="file"
        accept="application/pdf"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const key = await uploadToBucket("production-docs", `${productionId}/cue-sheets`, file);
            onUploaded(key);
            toast.success("PDF subido");
          } catch (err: any) {
            toast.error(err?.message ?? "No se pudo subir el archivo");
          } finally {
            setBusy(false);
          }
        }}
      />
      {path && <span className="truncate text-xs text-muted-foreground">{path.split("/").pop()}</span>}
    </div>
  );
}