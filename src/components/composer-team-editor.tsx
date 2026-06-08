import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { IC_FUNCTION_GROUPS, IC_FUNCTION_LABEL, type IcTeamFunction } from "@/components/person-ic-functions-editor";

export type TeamRole =
  | "agente" | "manager" | "producer" | "comunicacion" | "facturacion" | "pagos" | "otro";

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  agente: "Agente",
  manager: "Manager",
  producer: "Producer",
  comunicacion: "Comunicación",
  facturacion: "Facturación",
  pagos: "Pagos",
  otro: "Otro",
};

type Assignment = {
  id: string;
  composer_id: string;
  person_id: string;
  team_role: TeamRole | null;
  ic_function: IcTeamFunction | null;
  role_other: string | null;
  start_date: string | null;
  objectives: string | null;
  kpi_review: string | null;
  kpi_review_date: string | null;
  position: number;
};

type Person = { id: string; full_name: string; email: string | null };

export function ComposerTeamEditor({ composerId }: { composerId: string }) {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase
          .from("composer_team_assignments")
          .select("*")
          .eq("composer_id", composerId)
          .order("position"),
        supabase
          .from("ic_team")
          .select("id, full_name, email")
          .eq("role", "ic_team")
          .order("full_name"),
      ]);
      setRows((a as Assignment[]) ?? []);
      setPeople((p as Person[]) ?? []);
      setLoading(false);
    })();
  }, [composerId]);

  async function add() {
    if (!people[0]) return toast.error("Crea antes una persona del equipo IC.");
    const { data, error } = await supabase
      .from("composer_team_assignments")
      .insert({
        composer_id: composerId,
        person_id: people[0].id,
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

  if (loading) return <p className="text-sm text-muted-foreground">Cargando equipo…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          Cada asignación cruza una persona del Equipo IC con su función (38 funciones disponibles).
        </p>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          + Añadir asignación
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin equipo asignado todavía.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-sm border border-border bg-card/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Persona</Label>
                  <Select
                    value={r.person_id}
                    onValueChange={(v) => update(r.id, { person_id: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {people.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Función IC</Label>
                  <Select
                    value={r.ic_function ?? ""}
                    onValueChange={(v) => update(r.id, { ic_function: v as IcTeamFunction })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecciona función…" /></SelectTrigger>
                    <SelectContent>
                      {IC_FUNCTION_GROUPS.map((g) => (
                        <div key={g.label}>
                          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{g.label}</div>
                          {g.items.map((it) => (
                            <SelectItem key={it.value} value={it.value}>{IC_FUNCTION_LABEL[it.value]}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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