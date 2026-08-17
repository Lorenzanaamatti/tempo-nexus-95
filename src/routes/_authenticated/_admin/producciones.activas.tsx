import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Clapperboard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { ProductionSearch, ProductionsTable, useProductions } from "@/components/production-lists";
import { isFinalized, PRODUCTION_STAGE_LABEL, STAGE_DEFAULT_STATUS, type ProductionStage } from "@/lib/production-lifecycle";
import { PRODUCTION_KIND_LABEL, type ProductionKind } from "@/lib/production-constants";

export const Route = createFileRoute("/_authenticated/_admin/producciones/activas")({
  component: ProduccionesActivas,
});

const NEW_KINDS: ProductionKind[] = ["cine", "serie", "publicidad", "videojuego", "produccion_especial"];

function ProduccionesActivas() {
  const productionsQ = useProductions();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (productionsQ.data ?? [])
      .filter((p) => !isFinalized(p.status))
      .filter((p) => !needle || p.title.toLowerCase().includes(needle));
  }, [productionsQ.data, q]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Producciones</p>
          <h1 className="mt-1 font-display text-5xl title-caps">PRODUCCIONES ACTIVAS</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Producciones en curso. Al marcarlas como finalizadas pasan al archivo de producciones finalizadas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProductionSearch value={q} onChange={setQ} />
          <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Nueva producción</Button>
        </div>
      </div>

      {productionsQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : !rows.length ? (
        q ? (
          <EmptyState variant="filtered" title="Ningún resultado" description="Ninguna producción activa coincide con la búsqueda." action={{ label: "Limpiar búsqueda", onClick: () => setQ("") }} />
        ) : (
          <EmptyState icon={Clapperboard} title="Sin producciones activas" description="Crea una nueva producción para empezar a seguir su ciclo de vida." />
        )
      ) : (
        <ProductionsTable rows={rows} />
      )}

      <NewProductionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewProductionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ProductionKind>("cine");
  const [composerId, setComposerId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [stage, setStage] = useState<ProductionStage>("negociacion");
  const [saving, setSaving] = useState(false);

  const composersQ = useQuery({
    queryKey: ["composers-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("composers").select("id, full_name, artistic_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const companiesQ = useQuery({
    queryKey: ["production-companies-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_companies").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).from("productions").insert({
      title: title.trim(),
      project_type: kind,
      kind: PRODUCTION_KIND_LABEL[kind],
      composer_id: composerId || null,
      partner_company_id: companyId || null,
      delivery_date: deliveryDate || null,
      status: STAGE_DEFAULT_STATUS[stage],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Producción creada");
    setTitle(""); setComposerId(""); setCompanyId(""); setDeliveryDate("");
    onOpenChange(false);
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
    qc.invalidateQueries({ queryKey: ["productions"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva producción</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as ProductionKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NEW_KINDS.map((k) => (<SelectItem key={k} value={k}>{PRODUCTION_KIND_LABEL[k]}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Estado inicial</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as ProductionStage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRODUCTION_STAGE_LABEL) as ProductionStage[]).map((s) => (
                    <SelectItem key={s} value={s}>{PRODUCTION_STAGE_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Compositor vinculado</Label>
            <Select value={composerId || undefined} onValueChange={setComposerId}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                {(composersQ.data ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.artistic_name || c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Cliente / Partner vinculado</Label>
            <Select value={companyId || undefined} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                {(companiesQ.data ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Fecha entrega estimada</Label>
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !title.trim()}>Crear producción</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
