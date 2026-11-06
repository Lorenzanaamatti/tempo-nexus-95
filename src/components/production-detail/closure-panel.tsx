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
import { ExternalLink } from "lucide-react";

const db = supabase as any;

export type ClosureRow = Record<string, any>;

export const CUE_USOS = ["Main title", "Score", "Source", "End title", "Otro"] as const;

export const CLOSURE_ITEM_KEYS = [
  "presupuesto_ok",
  "deal_memo_ok",
  "contrato_ok",
  "cue_sheet_ok",
  "entregables_ok",
] as const;

export const CLOSURE_ITEMS: [typeof CLOSURE_ITEM_KEYS[number], string][] = [
  ["presupuesto_ok", "Presupuesto aprobado y archivado"],
  ["deal_memo_ok", "Deal Memo cerrado"],
  ["contrato_ok", "Contrato cerrado"],
  ["cue_sheet_ok", "Music cue sheet generada y enviada"],
  ["entregables_ok", "Entregables musicales entregados"],
];

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
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await db.from("production_documents").select("id, title, kind").eq("production_id", productionId).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  return { memosQ, contractsQ, docsQ };
}

export function ProductionClosurePanel({
  productionId,
  compact,
}: {
  productionId: string;
  productionTitle?: string;
  stage?: string;
  isBigC?: boolean;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const closureQ = useClosure(productionId);
  const [form, setForm] = useState<ClosureRow>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(closureQ.data ?? { production_id: productionId });
  }, [closureQ.data, productionId]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      let url = String(form.carpeta_drive_url ?? "").trim();
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      const payload: ClosureRow = { production_id: productionId, carpeta_drive_url: url || null };
      for (const k of CLOSURE_ITEM_KEYS) payload[k] = !!form[k];
      const { error } = await db.from("production_closures").upsert(payload, { onConflict: "production_id" });
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: ["production-closure", productionId] });
      toast.success("Checklist de cierre guardado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const link = String(form.carpeta_drive_url ?? "").trim();

  return (
    <div className={cn("space-y-4", compact && "max-h-[60vh] overflow-y-auto pr-1")}>
      <div className="space-y-3 rounded-sm border border-border p-4">
        {CLOSURE_ITEMS.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2">
            <Checkbox checked={!!form[k]} onCheckedChange={(v) => set(k, Boolean(v))} />
            <span className="font-display text-sm">{label}</span>
          </label>
        ))}
      </div>
      <div className="grid gap-1.5 rounded-sm border border-border p-4">
        <Label>Carpeta de Drive con los documentos finales</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="min-w-[220px] flex-1" placeholder="Pegar enlace de la carpeta de Drive" value={form.carpeta_drive_url ?? ""} onChange={(e) => set("carpeta_drive_url", e.target.value)} />
          {link && (
            <a href={/^https?:\/\//i.test(link) ? link : `https://${link}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir
            </a>
          )}
        </div>
      </div>
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