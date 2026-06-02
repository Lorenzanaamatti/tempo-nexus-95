import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TEAM_ROLE_LABEL, type TeamRole } from "@/components/composer-team-editor";

type Assignment = {
  id: string;
  composer_id: string;
  person_id: string;
  team_role: TeamRole;
  role_other: string | null;
  start_date: string | null;
  objectives: string | null;
  kpi_review: string | null;
  kpi_review_date: string | null;
  position: number;
};

type Composer = { id: string; full_name: string; artistic_name: string | null };

export function PersonAssignmentsEditor({ personId }: { personId: string }) {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [composers, setComposers] = useState<Composer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: c }] = await Promise.all([
        supabase
          .from("composer_team_assignments")
          .select("*")
          .eq("person_id", personId)
          .order("position"),
        supabase
          .from("composers")
          .select("id, full_name, artistic_name")
          .order("full_name"),
      ]);
      setRows((a as Assignment[]) ?? []);
      setComposers((c as Composer[]) ?? []);
      setLoading(false);
    })();
  }, [personId]);

  async function add() {
    if (!composers[0]) return toast.error("Crea antes un representado.");
    const { data, error } = await supabase
      .from("composer_team_assignments")
      .insert({
        person_id: personId,
        composer_id: composers[0].id,
        team_role: "agente",
        position: (rows.at(-1)?.position ?? -1) + 1,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setRows([...rows, data as Assignment]);
  }

  async function update(id: string, patch: Partial<Assignment>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase
      .from("composer_team_assignments")
      .update(patch)
      .eq("id", id);
    if (error) toast.error(error.message);
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta asignación?")) return;
    const prev = rows;
    setRows(rows.filter((r) => r.id !== id));
    const { error } = await supabase.from("composer_team_assignments").delete().eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(error.message);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando asignaciones…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          Asigna esta persona a uno o varios representados con su rol y plan.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          + Asignar representado
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin asignaciones.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-sm border border-border bg-card/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Representado</Label>
                  <Select
                    value={r.composer_id}
                    onValueChange={(v) => update(r.id, { composer_id: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {composers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.artistic_name || c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rol</Label>
                  <Select
                    value={r.team_role}
                    onValueChange={(v) => update(r.id, { team_role: v as TeamRole })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TEAM_ROLE_LABEL) as TeamRole[]).map((k) => (
                        <SelectItem key={k} value={k}>{TEAM_ROLE_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {r.team_role === "otro" && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Describir rol</Label>
                    <Input
                      defaultValue={r.role_other ?? ""}
                      onBlur={(e) =>
                        e.target.value !== (r.role_other ?? "") &&
                        update(r.id, { role_other: e.target.value || null })
                      }
                    />
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de inicio</Label>
                  <Input
                    type="date"
                    defaultValue={r.start_date ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (r.start_date ?? "") &&
                      update(r.id, { start_date: e.target.value || null })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Próxima revisión KPI</Label>
                  <Input
                    type="date"
                    defaultValue={r.kpi_review_date ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (r.kpi_review_date ?? "") &&
                      update(r.id, { kpi_review_date: e.target.value || null })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Objetivos</Label>
                  <Textarea
                    rows={2}
                    defaultValue={r.objectives ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (r.objectives ?? "") &&
                      update(r.id, { objectives: e.target.value || null })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Revisión KPI / notas</Label>
                  <Textarea
                    rows={2}
                    defaultValue={r.kpi_review ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (r.kpi_review ?? "") &&
                      update(r.id, { kpi_review: e.target.value || null })
                    }
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}