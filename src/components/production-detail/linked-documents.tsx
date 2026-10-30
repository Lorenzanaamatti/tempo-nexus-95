import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/list-states";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExternalLink, FileText, Link2, Trash2, Unlink, Upload } from "lucide-react";

const db = supabase as any;
const BUCKET = "production-docs";

type DocRow = {
  kind: "deal_memo" | "contrato" | "propio"; id: string; title: string; status: string | null;
  url?: string | null; storage_path?: string | null; docKind?: string | null;
};

const DOC_KINDS = ["Presupuesto", "Deal memo", "Contrato", "Adenda", "Guion", "Cue sheet", "Otro"];
type Mode = "enlace" | "archivo" | "paperwork";

export function ProductionLinkedDocuments({ productionId }: { productionId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("enlace");
  const [docType, setDocType] = useState<"deal_memo" | "contrato">("deal_memo");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("Otro");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const key = ["production-documents-linked", productionId];
  const linkedQ = useQuery({
    queryKey: key,
    queryFn: async (): Promise<DocRow[]> => {
      const [dm, ct, own] = await Promise.all([
        db.from("deal_memos").select("id, referencia, obra, estado").eq("production_id", productionId),
        db.from("contracts").select("id, title, contract_type, sign_status").eq("production_id", productionId),
        db.from("production_documents").select("id, title, kind, url, storage_path").eq("production_id", productionId).order("created_at"),
      ]);
      if (dm.error) throw dm.error;
      if (ct.error) throw ct.error;
      if (own.error) throw own.error;
      return [
        ...(own.data ?? []).map((d: any) => ({ kind: "propio" as const, id: d.id, title: d.title, status: null, url: d.url, storage_path: d.storage_path, docKind: d.kind })),
        ...(dm.data ?? []).map((d: any) => ({ kind: "deal_memo" as const, id: d.id, title: d.referencia || d.obra || "Deal memo", status: d.estado ?? null })),
        ...(ct.data ?? []).map((c: any) => ({ kind: "contrato" as const, id: c.id, title: c.title || c.contract_type || "Contrato", status: c.sign_status ?? null })),
      ];
    },
  });

  const candidatesQ = useQuery({
    queryKey: ["production-documents-candidates", docType],
    enabled: open && mode === "paperwork",
    queryFn: async () => {
      if (docType === "deal_memo") {
        const { data, error } = await db.from("deal_memos").select("id, referencia, obra").is("production_id", null).order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return (data ?? []).map((d: any) => ({ id: d.id, label: d.referencia || d.obra || "Deal memo" }));
      }
      const { data, error } = await db.from("contracts").select("id, title, contract_type").is("production_id", null).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []).map((c: any) => ({ id: c.id, label: c.title || c.contract_type || "Contrato" }));
    },
  });

  function reset() {
    setOpen(false); setPicked(""); setQ(""); setTitle(""); setUrl(""); setFile(null); setKind("Otro");
  }

  async function save() {
    setBusy(true);
    try {
      if (mode === "paperwork") {
        if (!picked) return;
        const table = docType === "deal_memo" ? "deal_memos" : "contracts";
        const { error } = await db.from(table).update({ production_id: productionId }).eq("id", picked);
        if (error) throw error;
      } else if (mode === "enlace") {
        let u = url.trim();
        if (!u) throw new Error("Pega un enlace");
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        const { error } = await db.from("production_documents").insert({ production_id: productionId, title: title.trim() || u, kind, url: u });
        if (error) throw error;
      } else {
        if (!file) throw new Error("Elige un archivo");
        const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
        const path = `${productionId}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file);
        if (up.error) throw up.error;
        const { error } = await db.from("production_documents").insert({ production_id: productionId, title: title.trim() || file.name, kind, storage_path: path });
        if (error) throw error;
      }
      toast.success("Documento vinculado");
      reset();
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["closure-production-documents", productionId] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo vincular");
    } finally {
      setBusy(false);
    }
  }

  async function openOwn(r: DocRow) {
    if (r.url) return window.open(r.url, "_blank", "noopener");
    if (!r.storage_path) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function unlink(row: DocRow) {
    if (row.kind === "propio") {
      if (row.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]);
      const { error } = await db.from("production_documents").delete().eq("id", row.id);
      if (error) return toast.error(error.message);
    } else {
      const table = row.kind === "deal_memo" ? "deal_memos" : "contracts";
      const { error } = await db.from(table).update({ production_id: null }).eq("id", row.id);
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: key });
  }

  const rows = linkedQ.data ?? [];
  const needle = q.trim().toLowerCase();
  const candidates = (candidatesQ.data ?? []).filter((c: any) => !needle || c.label.toLowerCase().includes(needle));
  const canSave = mode === "paperwork" ? !!picked : mode === "enlace" ? !!url.trim() : !!file;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Link2 className="mr-1 h-4 w-4" /> Vincular documento</Button>
      </div>
      {!rows.length ? (
        <EmptyState variant="inline" icon={FileText} title="Sin documentos vinculados" description="Añade un enlace, sube un archivo o vincula un deal memo o contrato de PAPERWORK." />
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {rows.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] smallcaps">
                {r.kind === "deal_memo" ? "Deal memo / Presupuesto" : r.kind === "contrato" ? "Contrato" : `${r.docKind ?? "Documento"} · ${r.url ? "Enlace" : "Archivo"}`}
              </span>
              {r.kind === "deal_memo" ? (
                <Link to="/deal-memos/$dealMemoId" params={{ dealMemoId: r.id }} className="font-display hover:underline">{r.title}</Link>
              ) : r.kind === "contrato" ? (
                <Link to="/contracts/$contractId" params={{ contractId: r.id }} className="font-display hover:underline">{r.title}</Link>
              ) : (
                <button type="button" onClick={() => openOwn(r)} className="inline-flex items-center gap-1 font-display hover:underline">
                  {r.title} <ExternalLink className="h-3 w-3" />
                </button>
              )}
              {r.status && <span className="text-xs text-muted-foreground">{String(r.status).replace(/_/g, " ")}</span>}
              <Button variant="ghost" size="sm" className="ml-auto" aria-label={r.kind === "propio" ? "Eliminar" : "Desvincular"} onClick={() => unlink(r)}>
                {r.kind === "propio" ? <Trash2 className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular documento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-1 rounded-sm border border-border p-1">
            {([["enlace", "Pegar enlace"], ["archivo", "Subir archivo"], ["paperwork", "De PAPERWORK"]] as const).map(([m, l]) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={cn("rounded-sm px-2 py-1.5 text-xs smallcaps", mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {l}
              </button>
            ))}
          </div>

          {mode === "paperwork" ? (
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={docType} onValueChange={(v) => { setDocType(v as any); setPicked(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deal_memo">Presupuesto / Deal memo</SelectItem>
                    <SelectItem value="contrato">Contrato / Adenda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Buscar</Label>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Referencia o título…" />
              </div>
              <div className="max-h-56 overflow-y-auto rounded-sm border border-border">
                {candidates.map((c: any) => (
                  <button key={c.id} type="button" onClick={() => setPicked(c.id)}
                    className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-muted ${picked === c.id ? "bg-muted" : ""}`}>
                    {c.label}
                  </button>
                ))}
                {!candidates.length && <p className="px-3 py-2 text-sm text-muted-foreground">No hay documentos de PAPERWORK sin vincular. Usa «Pegar enlace» o «Subir archivo».</p>}
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {mode === "enlace" ? (
                <div>
                  <Label className="text-xs">Enlace</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…" />
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Archivo</Label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border px-3 py-3 text-sm hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    <span className="truncate">{file ? file.name : "Elegir archivo (PDF, Word, Excel, imagen…)"}</span>
                    <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Opcional" />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={kind} onValueChange={setKind}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOC_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={reset}>Cancelar</Button>
            <Button onClick={save} disabled={!canSave || busy}>{busy ? "Guardando…" : "Vincular"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
