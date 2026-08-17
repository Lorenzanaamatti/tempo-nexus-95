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
import { toast } from "sonner";
import { FileText, Link2, Unlink } from "lucide-react";

type DocRow = {
  kind: "deal_memo" | "contrato";
  id: string;
  title: string;
  status: string | null;
};

export function ProductionLinkedDocuments({ productionId }: { productionId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<"deal_memo" | "contrato">("deal_memo");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState("");

  const linkedQ = useQuery({
    queryKey: ["production-documents-linked", productionId],
    queryFn: async (): Promise<DocRow[]> => {
      const [dm, ct] = await Promise.all([
        (supabase as any).from("deal_memos").select("id, referencia, obra, estado").eq("production_id", productionId),
        (supabase as any).from("contracts").select("id, title, contract_type, sign_status").eq("production_id", productionId),
      ]);
      if (dm.error) throw dm.error;
      if (ct.error) throw ct.error;
      return [
        ...(dm.data ?? []).map((d: any) => ({
          kind: "deal_memo" as const,
          id: d.id,
          title: d.referencia || d.obra || "Deal memo",
          status: d.estado ?? null,
        })),
        ...(ct.data ?? []).map((c: any) => ({
          kind: "contrato" as const,
          id: c.id,
          title: c.title || c.contract_type || "Contrato",
          status: c.sign_status ?? null,
        })),
      ];
    },
  });

  const candidatesQ = useQuery({
    queryKey: ["production-documents-candidates", docType],
    enabled: open,
    queryFn: async () => {
      if (docType === "deal_memo") {
        const { data, error } = await (supabase as any)
          .from("deal_memos").select("id, referencia, obra, estado").is("production_id", null)
          .order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return (data ?? []).map((d: any) => ({ id: d.id, label: d.referencia || d.obra || "Deal memo" }));
      }
      const { data, error } = await (supabase as any)
        .from("contracts").select("id, title, contract_type").is("production_id", null)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []).map((c: any) => ({ id: c.id, label: c.title || c.contract_type || "Contrato" }));
    },
  });

  async function linkDoc() {
    if (!picked) return;
    const table = docType === "deal_memo" ? "deal_memos" : "contracts";
    const { error } = await (supabase as any).from(table).update({ production_id: productionId }).eq("id", picked);
    if (error) return toast.error(error.message);
    toast.success("Documento vinculado");
    setOpen(false); setPicked(""); setQ("");
    qc.invalidateQueries({ queryKey: ["production-documents-linked", productionId] });
  }

  async function unlink(row: DocRow) {
    const table = row.kind === "deal_memo" ? "deal_memos" : "contracts";
    const { error } = await (supabase as any).from(table).update({ production_id: null }).eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["production-documents-linked", productionId] });
  }

  const rows = linkedQ.data ?? [];
  const needle = q.trim().toLowerCase();
  const candidates = (candidatesQ.data ?? []).filter((c: any) => !needle || c.label.toLowerCase().includes(needle));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Link2 className="mr-1 h-4 w-4" /> Vincular documento</Button>
      </div>
      {!rows.length ? (
        <EmptyState variant="inline" icon={FileText} title="Sin documentos vinculados" description="Vincula presupuestos, deal memos, contratos de obra o adendas de PAPERWORK." />
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {rows.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] smallcaps">
                {r.kind === "deal_memo" ? "Deal memo / Presupuesto" : "Contrato"}
              </span>
              {r.kind === "deal_memo" ? (
                <Link to="/deal-memos/$dealMemoId" params={{ dealMemoId: r.id }} className="font-display hover:underline">{r.title}</Link>
              ) : (
                <Link to="/contracts/$contractId" params={{ contractId: r.id }} className="font-display hover:underline">{r.title}</Link>
              )}
              {r.status && <span className="text-xs text-muted-foreground">{String(r.status).replace(/_/g, " ")}</span>}
              <Button variant="ghost" size="sm" className="ml-auto" aria-label="Desvincular" onClick={() => unlink(r)}>
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular documento de PAPERWORK</DialogTitle></DialogHeader>
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
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPicked(c.id)}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-muted ${picked === c.id ? "bg-muted" : ""}`}
                >
                  {c.label}
                </button>
              ))}
              {!candidates.length && <p className="px-3 py-2 text-sm text-muted-foreground">Sin documentos disponibles.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={linkDoc} disabled={!picked}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}