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
import { TASK_STATUSES } from "@/lib/task-status";

type LinkedProduction = { id: string; title: string };
type OpenOptions = { area?: TaskArea | null; production?: LinkedProduction | null };
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
  const [initialProduction, setInitialProduction] = useState<LinkedProduction | null>(null);

  const open = useCallback((opts?: OpenOptions) => {
    setInitialArea(opts?.area ?? null);
    setInitialProduction(opts?.production ?? null);
    setOpen(true);
  }, []);

  return (
    <TaskDialogCtx.Provider value={{ open }}>
      {children}
      <NewTaskDialog
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        initialArea={initialArea}
        initialProduction={initialProduction}
      />
    </TaskDialogCtx.Provider>
  );
}

function NewTaskDialog({
  isOpen, onClose, initialArea, initialProduction,
}: { isOpen: boolean; onClose: () => void; initialArea: TaskArea | null; initialProduction: LinkedProduction | null }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [area, setArea] = useState<TaskArea | "">(initialArea ?? "");
  const [subarea, setSubarea] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<string>("pendiente");
  const [productionId, setProductionId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const titleError = submitted && !title.trim() ? "Escribe qué hay que hacer." : null;
  const areaError = submitted && !area ? "Elige el área a la que pertenece la tarea." : null;

  useEffect(() => {
    if (isOpen) {
      setArea(initialArea ?? "");
      setProductionId(initialProduction?.id ?? "");
      setSubmitted(false);
    }
  }, [isOpen, initialArea, initialProduction]);

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

  const productionsQ = useQuery({
    queryKey: ["productions-for-tasks"],
    enabled: isOpen,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("productions").select("id, title").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string }>;
    },
  });

  async function save() {
    setSubmitted(true);
    if (!title.trim() || !area) return;
    setSaving(true);
    const { error } = await (supabase as any).from("actions").insert({
      title: title.trim(),
      notes: notes.trim() || null,
      kind: "tarea",
      area,
      subarea: subarea.trim() || null,
      due_date: dueDate || null,
      assignee_person_id: assignee || null,
      production_id: productionId || null,
      status,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarea creada");
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["task-inbox"] });
    setTitle(""); setNotes(""); setSubarea(""); setAssignee(""); setDueDate(""); setStatus("pendiente"); setProductionId("");
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["production-tasks"] });
    setSubmitted(false);
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
            <Label className="text-xs">Tarea</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué hay que hacer?"
              aria-invalid={!!titleError}
              aria-describedby={titleError ? "task-title-error" : undefined}
            />
            {titleError && (
              <p id="task-title-error" className="mt-1 text-xs text-destructive">{titleError}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Detalle <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto, enlaces, criterios de entrega…"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Área</Label>
              <Select value={area || undefined} onValueChange={(v) => setArea(v as TaskArea)}>
                <SelectTrigger aria-invalid={!!areaError} aria-describedby={areaError ? "task-area-error" : undefined}>
                  <SelectValue placeholder="Elige un área" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {areaError && (
                <p id="task-area-error" className="mt-1 text-xs text-destructive">{areaError}</p>
              )}
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
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Producción vinculada <span className="text-muted-foreground">(opcional)</span></Label>
            <Select value={productionId || "none"} onValueChange={(v) => setProductionId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sin producción" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin producción</SelectItem>
                {(productionsQ.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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