import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { formatDateEs } from "@/lib/dates";
import { IC_FUNCTION_GROUPS, IC_FUNCTION_LABEL, type IcTeamFunction } from "@/components/person-ic-functions-editor";

/** Personal del equipo IC asignado a la producción (no incluye compositores ni externos). */
export function IcStaffEditor({ productionId }: { productionId: string }) {
  const qc = useQueryClient();
  const [personId, setPersonId] = useState<string>("");
  const [role, setRole] = useState<IcTeamFunction | "">("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const peopleIcQ = useQuery({
    queryKey: ["people-ic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, full_name, role")
        .eq("role", "ic_team")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignsQ = useQuery({
    queryKey: ["prod-assigns", productionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_assignments")
        .select("id, role_in_project, start_date, end_date, composer_id, person_id, composers(id, full_name, artistic_name), people(id, full_name)")
        .eq("production_id", productionId)
        .not("person_id", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function add() {
    if (!personId) return toast.error("Selecciona una persona del equipo IC.");
    if (!role) return toast.error("Selecciona una categoría del equipo IC.");
    const { error } = await supabase.from("production_assignments").insert({
      production_id: productionId,
      person_id: personId,
      role_in_project: role,
      start_date: start || null,
      end_date: end || null,
    });
    if (error) return toast.error(error.message);
    setPersonId(""); setRole(""); setStart(""); setEnd("");
    qc.invalidateQueries({ queryKey: ["prod-assigns", productionId] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("production_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["prod-assigns", productionId] });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 rounded-sm border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_160px_160px_auto] sm:items-end">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Equipo IC</Label>
          <Select value={personId || undefined} onValueChange={setPersonId}>
            <SelectTrigger><SelectValue placeholder="Selecciona persona…" /></SelectTrigger>
            <SelectContent>
              {(peopleIcQ.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Rol</Label>
          <Select value={role || undefined} onValueChange={(v) => setRole(v as IcTeamFunction)}>
            <SelectTrigger><SelectValue placeholder="Categoría IC…" /></SelectTrigger>
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
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Inicio</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Final</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Button onClick={add} disabled={!personId || !role}><Plus className="mr-1 h-4 w-4" /> Asignar</Button>
      </div>
      {(assignsQ.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin asignaciones.</p>
      ) : (
        <div className="divide-y divide-border rounded-sm border border-border">
          {(assignsQ.data ?? []).map((a: any) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="font-display">{a.people?.full_name || a.composers?.artistic_name || a.composers?.full_name}</span>
              {a.composer_id && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Asignación anterior de cliente</span>}
              {a.role_in_project && <span className="text-xs text-muted-foreground">{IC_FUNCTION_LABEL[a.role_in_project as IcTeamFunction] ?? a.role_in_project}</span>}
              {(a.start_date || a.end_date) && (
                <span className="text-xs text-muted-foreground">Inicio: {a.start_date ? formatDateEs(a.start_date) : "—"} · Final: {a.end_date ? formatDateEs(a.end_date) : "—"}</span>
              )}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => remove(a.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}