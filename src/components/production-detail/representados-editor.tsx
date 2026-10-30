import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/list-states";
import { ALL_REPRESENTADO_ROLES, REPRESENTADO_ROLE_LABEL, ROSTER_ROLE_LABEL } from "@/lib/production-milestones";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";

export type LinkedRepresentado = {
  id: string;
  composer_id: string | null;
  production_id?: string;
  external_name?: string | null;
  role_in_project: string | null;
  composers?: { id: string; full_name: string | null; artistic_name: string | null; roster_role?: string | null } | null;
};

export function useProductionRepresentados(productionId: string) {
  return useQuery({
    queryKey: ["production-representados", productionId],
    queryFn: async () => {
      const ids = await siblingIds(productionId);
      const { data, error } = await supabase
        .from("production_assignments")
        .select("id, production_id, composer_id, external_name, role_in_project, composers(id, full_name, artistic_name, roster_role)")
        .in("production_id", ids)
        .or("composer_id.not.is.null,external_name.not.is.null")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as LinkedRepresentado[];
    },
  });
}

/** Todas las entradas de la misma película (una por representado). */
export async function siblingIds(productionId: string): Promise<string[]> {
  const db = supabase as any;
  const { data } = await db.from("productions").select("sibling_group_id").eq("id", productionId).maybeSingle();
  if (!data?.sibling_group_id) return [productionId];
  const { data: rows } = await db.from("productions").select("id").eq("sibling_group_id", data.sibling_group_id);
  return (rows ?? []).map((r: any) => r.id);
}

export function representadoName(r: LinkedRepresentado) {
  return r.composers?.artistic_name || r.composers?.full_name || r.external_name || "—";
}

export function ProductionRepresentadosEditor({ productionId }: { productionId: string }) {
  const qc = useQueryClient();
  const linksQ = useProductionRepresentados(productionId);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("compositor_principal");
  const [customRole, setCustomRole] = useState("");
  const [rosterFilter, setRosterFilter] = useState<string>("all");
  const [picked, setPicked] = useState<string>("");
  const [represented, setRepresented] = useState(true);
  const [externalName, setExternalName] = useState("");

  const rosterQ = useQuery({
    queryKey: ["composers-mini-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composers")
        .select("id, full_name, artistic_name, roster_role")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const needle = q.trim().toLowerCase();
  const candidates = (rosterQ.data ?? []).filter((c: any) => {
    const okText = !needle || `${c.artistic_name ?? ""} ${c.full_name ?? ""}`.toLowerCase().includes(needle);
    const okRole = rosterFilter === "all" || (c.roster_role ?? "other") === rosterFilter;
    return okText && okRole;
  });

  const rosterTabs = [
    { value: "all", label: "Todos" },
    { value: "composer", label: "Compositores" },
    { value: "artist", label: "Artistas" },
    { value: "supervisor", label: "Supervisores" },
    { value: "specialist", label: "Especialistas" },
    { value: "curator", label: "Curadores" },
    { value: "other", label: "Otros" },
  ];

  async function link() {
    if (represented ? !picked : !externalName.trim()) return;
    const finalRole = role === "otro" ? customRole.trim() : role;
    if (role === "otro" && !finalRole) return toast.error("Indica el rol");
    if (represented) {
      // Cada representado tiene su propia entrada de la producción.
      const { data: newId, error: splitErr } = await (supabase as any).rpc("split_production_for_composer", {
        _production_id: productionId,
        _composer_id: picked,
      });
      if (splitErr) return toast.error(splitErr.message);
      if (finalRole && finalRole !== "compositor_principal") {
        await (supabase as any).from("production_assignments").update({ role_in_project: finalRole })
          .eq("production_id", newId).eq("composer_id", picked);
      }
      toast.success(newId === productionId ? "Representado vinculado" : "Creada su propia ficha de esta producción");
      setOpen(false); setPicked(""); setQ(""); setCustomRole("");
      qc.invalidateQueries({ queryKey: ["production-representados"] });
      qc.invalidateQueries({ queryKey: ["production-siblings"] });
      qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
      return;
    }
    const { error } = await supabase.from("production_assignments").insert({
      production_id: productionId,
      composer_id: represented ? picked : null,
      external_name: represented ? null : externalName.trim(),
      role_in_project: finalRole,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Representado vinculado");
    setOpen(false); setPicked(""); setQ(""); setCustomRole(""); setExternalName("");
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
          <Plus className="mr-1 h-4 w-4" /> Añadir persona
        </Button>
      </div>
      {!rows.length ? (
        <EmptyState variant="inline" icon={Users} title="Sin personas vinculadas" description="Añade compositores, supervisores, clientes… representados o no." />
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              {r.composer_id ? (
                <Link to="/composers/$composerId" params={{ composerId: r.composer_id }} className="font-display hover:underline">
                  {representadoName(r)}
                </Link>
              ) : (
                <span className="font-display">{representadoName(r)}</span>
              )}
              <span className={`text-[10px] uppercase tracking-wide ${r.composer_id ? "text-primary" : "text-muted-foreground"}`}>
                {r.composer_id ? "Representado" : "No representado"}
              </span>
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] smallcaps">
                {REPRESENTADO_ROLE_LABEL[r.role_in_project ?? ""] ?? r.role_in_project ?? "Sin rol"}
              </span>
              {r.composers?.roster_role && (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {ROSTER_ROLE_LABEL[r.composers.roster_role] ?? r.composers.roster_role}
                </span>
              )}
              {r.composer_id && r.production_id && r.production_id !== productionId && (
                <Link to="/producciones/$productionId" params={{ productionId: r.production_id }} className="text-xs text-primary hover:underline">
                  su ficha de esta producción →
                </Link>
              )}
              {r.composer_id && (
                <Link to="/composers/$composerId" params={{ composerId: r.composer_id }} className="text-xs text-muted-foreground hover:underline">
                  ver ficha →
                </Link>
              )}
              <span className="ml-auto">
                <ConfirmDeleteButton iconOnly title="¿Desvincular representado?" label="Desvincular" confirmLabel="Desvincular" onConfirm={() => unlink(r.id)} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Añadir persona a la producción</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={represented} onCheckedChange={(v) => setRepresented(v === true)} />
              Representado por la agencia
            </label>
            {!represented ? (
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input value={externalName} onChange={(e) => setExternalName(e.target.value)} placeholder="Escribe el nombre…" maxLength={200} />
              </div>
            ) : (<>
            <div className="flex flex-wrap gap-1">
              {rosterTabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setRosterFilter(t.value)}
                  className={`rounded-sm border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide ${rosterFilter === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
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
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted ${picked === c.id ? "bg-muted" : ""}`}
                >
                  <span>{c.artistic_name || c.full_name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {ROSTER_ROLE_LABEL[c.roster_role ?? "other"] ?? c.roster_role}
                  </span>
                </button>
              ))}
              {!candidates.length && <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</p>}
            </div>
            </>)}
            <div>
              <Label className="text-xs">Rol en la producción</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_REPRESENTADO_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {role === "otro" && (
                <Input className="mt-2" value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="Escribe el rol…" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={link} disabled={represented ? !picked : !externalName.trim()}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}