import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type EntitySubjectType =
  | "person" | "production" | "composer" | "opportunity" | "contract"
  | "production_company" | "platform" | "festival" | "award" | "grant"
  | "campaign" | "media_outlet" | "media_coverage" | "public_appearance";

const ACTION_KINDS = [
  { value: "tarea", label: "Tarea" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "llamada", label: "Llamada" },
  { value: "email", label: "Email" },
  { value: "reunion", label: "Reunión" },
  { value: "marketing", label: "Marketing" },
];

export function EntityActionsEditor({
  subjectType,
  subjectId,
  title = "Acciones y seguimiento",
  showAssignee = true,
}: {
  subjectType: EntitySubjectType;
  subjectId: string;
  title?: string;
  showAssignee?: boolean;
}) {
  const qc = useQueryClient();
  const queryKey = ["actions", subjectType, subjectId];

  const actionsQ = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("actions")
        .select("*, assignee:people!actions_assignee_person_id_fkey(id, full_name)")
        .eq("subject_type", subjectType)
        .eq("subject_id", subjectId)
        .order("done", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) {
        // fallback without FK alias (FK might not yet be defined)
        const { data: d2, error: e2 } = await (supabase as any)
          .from("actions")
          .select("*")
          .eq("subject_type", subjectType)
          .eq("subject_id", subjectId)
          .order("done", { ascending: true })
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });
        if (e2) throw e2;
        return d2 ?? [];
      }
      return data ?? [];
    },
  });

  const peopleQ = useQuery({
    queryKey: ["people-ic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, full_name")
        .eq("role", "ic_team")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: showAssignee,
  });

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newKind, setNewKind] = useState("tarea");
  const [newAssignee, setNewAssignee] = useState<string>("");

  async function addAction() {
    if (!newTitle.trim()) return;
    const { error } = await (supabase as any).from("actions").insert({
      subject_type: subjectType,
      subject_id: subjectId,
      title: newTitle.trim(),
      due_date: newDate || null,
      kind: newKind,
      assignee_person_id: newAssignee || null,
    });
    if (error) return toast.error(error.message);
    setNewTitle(""); setNewDate(""); setNewKind("tarea"); setNewAssignee("");
    qc.invalidateQueries({ queryKey });
  }

  async function toggleDone(id: string, done: boolean) {
    const { error } = await (supabase as any)
      .from("actions")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey });
  }

  async function removeAction(id: string) {
    const { error } = await (supabase as any).from("actions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey });
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-2xl">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Cada acción queda registrada con fecha y tipo. Márcalas como hechas cuando se completen.
      </p>
      <div className="mb-3 grid grid-cols-1 gap-2 rounded-sm border border-dashed border-border p-4 sm:grid-cols-[1fr,150px,150px,auto]">
        <div>
          <Label className="text-xs">Acción</Label>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ej. Llamar a productora" />
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={newKind} onValueChange={setNewKind}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Fecha</Label>
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={addAction}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
        </div>
        {showAssignee && (
          <div className="sm:col-span-4">
            <Label className="text-xs">Responsable (Equipo IC)</Label>
            <Select value={newAssignee || undefined} onValueChange={setNewAssignee}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                {(peopleQ.data ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {actionsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !actionsQ.data?.length ? (
        <p className="text-sm text-muted-foreground">Sin acciones registradas.</p>
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {actionsQ.data.map((a: any) => (
            <li key={a.id} className={`flex items-center gap-3 px-3 py-2 ${a.done ? "opacity-60" : ""}`}>
              <Checkbox checked={a.done} onCheckedChange={(v) => toggleDone(a.id, !!v)} />
              <div className="flex-1">
                <p className={`text-sm ${a.done ? "line-through" : ""}`}>{a.title}</p>
                <div className="flex flex-wrap gap-2 smallcaps text-[10px] text-muted-foreground">
                  {a.kind && <span>{a.kind}</span>}
                  {a.due_date && <span>· {a.due_date}</span>}
                  {a.assignee?.full_name && <span>· {a.assignee.full_name}</span>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeAction(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}