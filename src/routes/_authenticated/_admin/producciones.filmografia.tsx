import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { ProductionSearch, useProductions, clientName, composerName } from "@/components/production-lists";
import { PRODUCTION_KIND_LABEL, type ProductionKind } from "@/lib/production-constants";
import { STAGE_DEFAULT_STATUS } from "@/lib/production-lifecycle";

export const Route = createFileRoute("/_authenticated/_admin/producciones/filmografia")({
  component: FilmografiaIC,
});

const ALL = "__all__";

function FilmografiaIC() {
  const productionsQ = useProductions();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>(ALL);
  const [year, setYear] = useState<string>(ALL);
  const [open, setOpen] = useState(false);

  const all = productionsQ.data ?? [];

  const yearOf = (p: (typeof all)[number]) => {
    const iso = p.premiere_date ?? p.delivery_date;
    return p.year ? String(p.year) : iso ? iso.slice(0, 4) : "Sin año";
  };

  const years = useMemo(
    () => [...new Set(all.map(yearOf))].sort((a, b) => (a < b ? 1 : -1)),
    [all],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((p) => kind === ALL || p.project_type === kind)
      .filter((p) => year === ALL || yearOf(p) === year)
      .filter((p) => !needle || p.title.toLowerCase().includes(needle) || composerName(p).toLowerCase().includes(needle))
      .sort((a, b) => (yearOf(a) < yearOf(b) ? 1 : -1));
  }, [all, q, kind, year]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">PRODUCCIONES</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold title-caps">Filmografía IC</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Histórico completo de producciones de Interesante Compañía, incluyendo las anteriores a esta app.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProductionSearch value={q} onChange={setQ} />
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {Object.entries(PRODUCTION_KIND_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los años</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Entrada histórica</Button>
        </div>
      </div>

      <div className="mt-8">
        {productionsQ.isLoading ? (
          <ListSkeleton rows={8} />
        ) : !rows.length ? (
          <EmptyState title="Sin registros" description="Añade una entrada histórica para completar la filmografía." />
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 smallcaps text-xs">Año</th>
                  <th className="px-3 py-2 smallcaps text-xs">Título</th>
                  <th className="px-3 py-2 smallcaps text-xs">Tipo</th>
                  <th className="px-3 py-2 smallcaps text-xs">Compositor</th>
                  <th className="px-3 py-2 smallcaps text-xs">Cliente / Partner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{yearOf(p)}</td>
                    <td className="px-3 py-2">
                      <Link to="/producciones/$productionId" params={{ productionId: p.id }} className="font-display hover:underline">{p.title}</Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.project_type ? PRODUCTION_KIND_LABEL[p.project_type] : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{composerName(p)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{clientName(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HistoricalDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function HistoricalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ProductionKind>("cine");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).from("productions").insert({
      title: title.trim(),
      project_type: kind,
      kind: PRODUCTION_KIND_LABEL[kind],
      year: year ? Number(year) : null,
      is_historical: true,
      status: STAGE_DEFAULT_STATUS.finalizada,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Entrada histórica añadida");
    setTitle(""); setYear("");
    onOpenChange(false);
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva entrada histórica</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as ProductionKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCTION_KIND_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Año</Label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !title.trim()}>Añadir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
