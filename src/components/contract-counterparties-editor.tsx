import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, User, Plus, Trash2, UserPlus } from "lucide-react";

export type Counterparty = {
  id?: string;
  partner_company_id: string | null;
  person_id: string | null;
  name: string;
  role: string | null;
};

interface Props {
  contractId: string;
}

/**
 * Editor de contrapartes (múltiples). Cada contraparte puede ser:
 *  - una productora del CRM
 *  - una persona del CRM
 *  - un texto libre; si no existe en CRM se ofrece añadirla
 */
export function ContractCounterpartiesEditor({ contractId }: Props) {
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ["contract-counterparties", contractId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contract_counterparties")
        .select("id, partner_company_id, person_id, name, role, position")
        .eq("contract_id", contractId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const companiesQ = useQuery({
    queryKey: ["counterparties-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("production_companies").select("id, name").order("name");
      return data ?? [];
    },
  });
  const peopleQ = useQuery({
    queryKey: ["counterparties-people"],
    queryFn: async () => {
      const { data } = await supabase.from("people").select("id, full_name, role").order("full_name");
      return data ?? [];
    },
  });

  // Add input state
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return { companies: [], people: [] };
    const companies = (companiesQ.data ?? [])
      .filter((c: any) => (c.name || "").toLowerCase().includes(needle))
      .slice(0, 5);
    const people = (peopleQ.data ?? [])
      .filter((p: any) => (p.full_name || "").toLowerCase().includes(needle))
      .slice(0, 5);
    return { companies, people };
  }, [q, companiesQ.data, peopleQ.data]);

  async function addRow(row: Omit<Counterparty, "id">) {
    const pos = (listQ.data ?? []).length;
    const { error } = await (supabase as any).from("contract_counterparties").insert({
      contract_id: contractId,
      partner_company_id: row.partner_company_id,
      person_id: row.person_id,
      name: row.name,
      role: row.role,
      position: pos,
    });
    if (error) return toast.error(error.message);
    setQ("");
    qc.invalidateQueries({ queryKey: ["contract-counterparties", contractId] });
  }

  async function removeRow(id: string) {
    const { error } = await (supabase as any).from("contract_counterparties").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["contract-counterparties", contractId] });
  }

  async function updateRole(id: string, role: string) {
    await (supabase as any).from("contract_counterparties").update({ role: role || null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["contract-counterparties", contractId] });
  }

  // Add-to-CRM dialog state
  const [crmDialogOpen, setCrmDialogOpen] = useState(false);
  const [crmName, setCrmName] = useState("");
  const [crmKind, setCrmKind] = useState<"company" | "person">("company");
  const [crmPersonRole, setCrmPersonRole] = useState<string>("other");
  const [crmSaving, setCrmSaving] = useState(false);

  function openCrmDialog(name: string) {
    setCrmName(name);
    setCrmKind("company");
    setCrmPersonRole("other");
    setCrmDialogOpen(true);
    setOpen(false);
  }

  async function saveCrm() {
    const name = crmName.trim();
    if (!name) return;
    setCrmSaving(true);
    if (crmKind === "company") {
      const { data, error } = await supabase.from("production_companies").insert({ name }).select("id, name").single();
      setCrmSaving(false);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["counterparties-companies"] });
      qc.invalidateQueries({ queryKey: ["production-companies"] });
      await addRow({ partner_company_id: data!.id, person_id: null, name: data!.name, role: null });
      toast.success("Productora añadida al CRM y vinculada");
    } else {
      const { data, error } = await supabase
        .from("people")
        .insert({ full_name: name, role: crmPersonRole as any })
        .select("id, full_name")
        .single();
      setCrmSaving(false);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["counterparties-people"] });
      qc.invalidateQueries({ queryKey: ["people"] });
      await addRow({ partner_company_id: null, person_id: data!.id, name: data!.full_name, role: null });
      toast.success("Persona añadida al CRM y vinculada");
    }
    setCrmDialogOpen(false);
  }

  const rows: Counterparty[] = listQ.data ?? [];
  const showAddToCrm = q.trim().length > 0 && matches.companies.length === 0 && matches.people.length === 0;

  return (
    <div className="space-y-3">
      <div>
        <Label>Contrapartes</Label>
        <p className="text-xs text-muted-foreground">Puedes añadir más de una. Si no está en el CRM, podrás añadirla en el momento.</p>
      </div>

      {rows.length > 0 && (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2">
              <Badge variant="secondary" className="rounded-sm text-[10px] smallcaps">
                {r.partner_company_id ? (
                  <><Building2 className="mr-1 h-3 w-3" /> Productora</>
                ) : r.person_id ? (
                  <><User className="mr-1 h-3 w-3" /> CRM</>
                ) : (
                  <>Texto libre</>
                )}
              </Badge>
              <div className="flex-1 font-display text-base">{r.name}</div>
              <Input
                defaultValue={r.role ?? ""}
                placeholder="Rol (opcional)"
                className="h-8 w-40 text-xs"
                onBlur={(e) => {
                  if ((e.target.value || "") !== (r.role || "")) updateRole(r.id!, e.target.value);
                }}
              />
              <Button variant="ghost" size="sm" onClick={() => removeRow(r.id!)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div ref={wrapRef} className="relative">
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar productora o persona, o escribe un nombre nuevo…"
          />
          {q.trim() && (
            <Button
              type="button"
              variant="outline"
              onClick={() => addRow({ partner_company_id: null, person_id: null, name: q.trim(), role: null })}
              title="Añadir como texto libre"
            >
              <Plus className="mr-1 h-4 w-4" /> Libre
            </Button>
          )}
        </div>
        {open && q.trim() && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-sm border border-border bg-popover shadow-lg">
            {matches.companies.length > 0 && (
              <>
                <div className="px-3 py-1 smallcaps text-[10px] text-muted-foreground bg-muted/40">Productoras</div>
                {matches.companies.map((c: any) => (
                  <button
                    key={`co-${c.id}`}
                    type="button"
                    onClick={() => addRow({ partner_company_id: c.id, person_id: null, name: c.name, role: null })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.name}
                  </button>
                ))}
              </>
            )}
            {matches.people.length > 0 && (
              <>
                <div className="px-3 py-1 smallcaps text-[10px] text-muted-foreground bg-muted/40">Personas CRM</div>
                {matches.people.map((p: any) => (
                  <button
                    key={`pe-${p.id}`}
                    type="button"
                    onClick={() => addRow({ partner_company_id: null, person_id: p.id, name: p.full_name, role: null })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {p.full_name}
                    <span className="ml-auto text-[10px] text-muted-foreground">{p.role}</span>
                  </button>
                ))}
              </>
            )}
            {showAddToCrm && (
              <button
                type="button"
                onClick={() => openCrmDialog(q.trim())}
                className="flex w-full items-center gap-2 border-t border-border bg-emerald-500/10 px-3 py-2 text-left text-sm hover:bg-emerald-500/20"
              >
                <UserPlus className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                <span>Añadir «{q.trim()}» al CRM…</span>
              </button>
            )}
          </div>
        )}
      </div>

      <Dialog open={crmDialogOpen} onOpenChange={setCrmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir al CRM</DialogTitle>
            <DialogDescription>
              Esta contraparte aún no existe. Se acumulará en el CRM y quedará vinculada a este contrato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={crmName} onChange={(e) => setCrmName(e.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={crmKind} onValueChange={(v) => setCrmKind(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Productora / empresa</SelectItem>
                  <SelectItem value="person">Persona</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {crmKind === "person" && (
              <div>
                <Label>Rol en CRM</Label>
                <Select value={crmPersonRole} onValueChange={setCrmPersonRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ic_team">Equipo IC</SelectItem>
                    <SelectItem value="artist">Artista</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="specialist">Especialista</SelectItem>
                    <SelectItem value="curator">Curador musical</SelectItem>
                    <SelectItem value="other">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCrmDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveCrm} disabled={crmSaving || !crmName.trim()}>
              {crmSaving ? "Guardando…" : "Añadir y vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}