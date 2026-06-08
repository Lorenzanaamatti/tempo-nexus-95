import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  person_id: string;
  verifier_person_id: string;
  start_date: string | null;
  objectives: string | null;
  kpi_review: string | null;
  kpi_review_date: string | null;
  position: number;
};

type IcPerson = { id: string; full_name: string };

export function PersonVerifiersEditor({ personId }: { personId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<IcPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase
          .from("person_verifier_assignments")
          .select("*")
          .eq("person_id", personId)
          .order("position"),
        supabase
          .from("ic_team")
          .select("id, full_name")
          .eq("role", "ic_team")
          .neq("id", personId)
          .order("full_name"),
      ]);
      setRows((a as Row[]) ?? []);
      setPeople((p as IcPerson[]) ?? []);
      setLoading(false);
    })();
  }, [personId]);

  async function add() {
    if (!people[0]) return toast.error("Necesitas al menos otra persona del equipo IC.");
    const { data, error } = await supabase
      .from("person_verifier_assignments")
      .insert({
        person_id: personId,
        verifier_person_id: people[0].id,
        position: (rows.at(-1)?.position ?? -1) + 1,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setRows([...rows, data as Row]);
  }

  async function update(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase
      .from("person_verifier_assignments")
      .update(patch)
      .eq("id", id);
    if (error) toast.error(error.message);
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este verificador?")) return;
    const prev = rows;
    setRows(rows.filter((r) => r.id !== id));
    const { error } = await supabase.from("person_verifier_assignments").delete().eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(error.message);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando verificadores…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          Asigna una o varias personas del equipo IC como verificadores de esta persona.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          + Asignar verificador
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin verificadores.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-sm border border-border bg-card/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Verificador (Equipo IC)</Label>
                  <Select
                    value={r.verifier_person_id}
                    onValueChange={(v) => update(r.id, { verifier_person_id: v })}
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