import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/list-states";
import { REPRESENTADO_ROLES, REPRESENTADO_ROLE_LABEL } from "@/lib/production-milestones";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";

export type LinkedRepresentado = {
  id: string;
  composer_id: string;
  role_in_project: string | null;
  composers?: { id: string; full_name: string | null; artistic_name: string | null } | null;
};

export function useProductionRepresentados(productionId: string) {
  return useQuery({
    queryKey: ["production-representados", productionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_assignments")
        .select("id, composer_id, role_in_project, composers(id, full_name, artistic_name)")
        .eq("production_id", productionId)
        .not("composer_id", "is", null);
      if (error) throw error;
      return (data ?? []) as unknown as LinkedRepresentado[];
    },
  });
}

export function representadoName(r: LinkedRepresentado) {
  return r.composers?.artistic_name || r.composers?.full_name || "—";
}

export function ProductionRepresentadosEditor({ productionId }: { productionId: string }) {
  const qc = useQueryClient();
  const linksQ = useProductionRepresentados(productionId);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("compositor_principal");
  const [picked, setPicked] = useState<string>("");

  const rosterQ = useQuery({
    queryKey: ["composers-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("composers").select("id, full_name, artistic_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const needle = q.trim().toLowerCase();
  const candidates = (rosterQ.data ?? []).filter((c: any) =>
    !needle || `${c.artistic_name ?? ""} ${c.full_name ?? ""}`.toLowerCase().includes(needle),
  );

  async function link() {
    if (!picked) return;
    const { error } = await supabase.from("production_assignments").insert({
      production_id: productionId,
      composer_id: picked,
      role_in_project: role,
    });
    if (error) return toast.error(error.message);
    toast.success("Representado vinculado");
    setOpen(false); setPicked(""); setQ("");
    qc.invalidateQueries({ queryKey: ["production-representados", productionId] });
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
  }

  async function unlink(id: string) {
    const { error } = await supabase.from("production_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["production-representados", productionId] });
  }

  const rows = linksQ.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Vincular representado
        </Button>
      </div>
      {!rows.length ? (
        <EmptyState variant="inline" icon={Users} title="Sin representados vinculados" description="Vincula compositores o artistas del roster a esta producción." />
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <Link to="/composers/$composerId" params={{ composerId: r.composer_id }} className="font-display hover:underline">
                {representadoName(r)}
              </Link>
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] smallcaps">
                {REPRESENTADO_ROLE_LABEL[r.role_in_project ?? ""] ?? r.role_in_project ?? "Sin rol"}
              </span>
              <Link to="/composers/$composerId" params={{ composerId: r.composer_id }} className="text-xs text-muted-foreground hover:underline">
                ver ficha →
              </Link>
              <span className="ml-auto">
                <ConfirmDeleteButton iconOnly title="¿Desvincular representado?" label="Desvincular" confirmLabel="Desvincular" onConfirm={() => unlink(r.id)} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular representado</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Buscar en el roster</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre…" />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-sm border border-border">
              {candidates.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPicked(c.id)}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-muted ${picked === c.id ? "bg-muted" : ""}`}
                >
                  {c.artistic_name || c.full_name}
                </button>
              ))}
              {!candidates.length && <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</p>}
            </div>
            <div>
              <Label className="text-xs">Rol en la producción</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPRESENTADO_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={link} disabled={!picked}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}