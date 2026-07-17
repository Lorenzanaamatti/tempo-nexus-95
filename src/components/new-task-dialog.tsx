import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TASK_AREAS, type TaskArea } from "@/lib/task-areas";

type OpenOptions = { area?: TaskArea | null };
type Ctx = { open: (opts?: OpenOptions) => void };
const TaskDialogCtx = createContext<Ctx | null>(null);

export function useNewTaskDialog() {
  const ctx = useContext(TaskDialogCtx);
  if (!ctx) throw new Error("useNewTaskDialog must be used within TaskDialogProvider");
  return ctx;
}

export function TaskDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [initialArea, setInitialArea] = useState<TaskArea | null>(null);

  const open = useCallback((opts?: OpenOptions) => {
    setInitialArea(opts?.area ?? null);
    setOpen(true);
  }, []);

  return (
    <TaskDialogCtx.Provider value={{ open }}>
      {children}
      <NewTaskDialog
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        initialArea={initialArea}
      />
    </TaskDialogCtx.Provider>
  );
}

function NewTaskDialog({
  isOpen, onClose, initialArea,
}: { isOpen: boolean; onClose: () => void; initialArea: TaskArea | null }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<TaskArea | "">(initialArea ?? "");
  const [subarea, setSubarea] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setArea(initialArea ?? "");
  }, [isOpen, initialArea]);

  const peopleQ = useQuery({
    queryKey: ["people-all-for-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, full_name, role")
        .eq("role", "ic_team")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: isOpen,
  });

  const subareaSuggestQ = useQuery({
    queryKey: ["subarea-suggestions", area],
    enabled: isOpen && !!area,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("actions")
        .select("subarea")
        .eq("area", area)
        .not("subarea", "is", null)
        .limit(200);
      const set = new Set<string>();
      for (const row of data ?? []) if (row.subarea) set.add(row.subarea);
      return [...set].sort();
    },
  });

  async function save() {
    if (!title.trim()) { toast.error("Pon una descripción de la tarea"); return; }
    if (!area) { toast.error("Elige un área"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("actions").insert({
      title: title.trim(),
      kind: "tarea",
      area,
      subarea: subarea.trim() || null,
      due_date: dueDate || null,
      assignee_person_id: assignee || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarea creada");
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["task-inbox"] });
    setTitle(""); setSubarea(""); setAssignee(""); setDueDate("");
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Área</Label>
              <Select value={area || undefined} onValueChange={(v) => setArea(v as TaskArea)}>
                <SelectTrigger><SelectValue placeholder="Elige un área" /></SelectTrigger>
                <SelectContent>
                  {TASK_AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Subárea</Label>
              <Input
                value={subarea}
                onChange={(e) => setSubarea(e.target.value)}
                list="subarea-suggestions"
                placeholder="Ej. Redes Sociales"
              />
              <datalist id="subarea-suggestions">
                {(subareaSuggestQ.data ?? []).map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Responsable</Label>
              <Select value={assignee || undefined} onValueChange={setAssignee}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  {(peopleQ.data ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fecha de entrega</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            La fecha de entrada y el solicitante se rellenan automáticamente.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Crear tarea"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}