import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { TASK_AREAS } from "@/lib/task-areas";
import { TASK_STATUSES } from "@/lib/task-status";

export function invalidateTaskQueries(qc: ReturnType<typeof useQueryClient>) {
  for (const k of ["tasks", "task-inbox", "my-due-tasks", "production-tasks", "actions"]) qc.invalidateQueries({ queryKey: [k] });
}

export async function deleteTask(id: string) {
  const { error } = await (supabase as any).from("actions").delete().eq("id", id).select("id");
  if (error) throw error;
}

type Form = {
  title: string; notes: string; client: string; area: string; subarea: string;
  due_date: string; entry_date: string; status: string; assignee_person_id: string; production_id: string;
};

/** Ficha editable de una tarea: abrir, modificar y guardar sin eliminar. */
export function TaskEditDialog({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const taskQ = useQuery({
    queryKey: ["task-detail", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("actions").select("*").eq("id", taskId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const peopleQ = useQuery({
    queryKey: ["people-ic-team"],
    enabled: !!taskId,
    queryFn: async () => (await supabase.from("people").select("id, full_name").eq("role", "ic_team").order("full_name")).data ?? [],
  });
  const prodQ = useQuery({
    queryKey: ["productions-for-tasks"],
    enabled: !!taskId,
    queryFn: async () => ((await (supabase as any).from("productions").select("id, title").order("created_at", { ascending: false }).limit(300)).data ?? []) as Array<{ id: string; title: string }>,
  });

  useEffect(() => {
    const t = taskQ.data;
    if (!t) { setForm(null); return; }
    setForm({
      title: t.title ?? "", notes: t.notes ?? "", client: t.client ?? "", area: t.area ?? "general",
      subarea: t.subarea ?? "", due_date: t.due_date ?? "", entry_date: t.entry_date ?? "",
      status: t.status ?? "pendiente", assignee_person_id: t.assignee_person_id ?? "", production_id: t.production_id ?? "",
    });
  }, [taskQ.data]);

  const set = (k: keyof Form) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save() {
    if (!form || !taskId) return;
    if (!form.title.trim()) { toast.error("La tarea necesita un título."); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("actions").update({
      title: form.title.trim(), notes: form.notes.trim() || null, client: form.client.trim() || null,
      area: form.area || null, subarea: form.subarea.trim() || null, due_date: form.due_date || null,
      entry_date: form.entry_date || null, status: form.status,
      assignee_person_id: form.assignee_person_id || null, production_id: form.production_id || null,
    }).eq("id", taskId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarea actualizada");
    invalidateTaskQueries(qc);
    qc.invalidateQueries({ queryKey: ["task-detail", taskId] });
    onClose();
  }

  async function remove() {
    if (!taskId) return;
    try { await deleteTask(taskId); toast.success("Tarea eliminada"); invalidateTaskQueries(qc); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "No se ha podido eliminar"); }
  }

  return (
    <Dialog open={!!taskId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Editar tarea</DialogTitle></DialogHeader>
        {!form ? (
          <p className="text-sm text-muted-foreground">{taskQ.isLoading ? "Cargando…" : "No se encuentra la tarea."}</p>
        ) : (
          <div className="grid gap-3">
            <div><Label className="text-xs">Título</Label><Input value={form.title} onChange={(e) => set("title")(e.target.value)} /></div>
            <div><Label className="text-xs">Texto / detalle</Label><Textarea rows={5} value={form.notes} onChange={(e) => set("notes")(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Cliente</Label><Input value={form.client} onChange={(e) => set("client")(e.target.value)} placeholder="Ej. Filmax" /></div>
              <div>
                <Label className="text-xs">Producción vinculada</Label>
                <Select value={form.production_id || "none"} onValueChange={(v) => set("production_id")(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin producción</SelectItem>
                    {(prodQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Área</Label>
                <Select value={form.area} onValueChange={set("area")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Subárea</Label><Input value={form.subarea} onChange={(e) => set("subarea")(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Fecha de entrada</Label><Input type="date" value={form.entry_date} onChange={(e) => set("entry_date")(e.target.value)} /></div>
              <div><Label className="text-xs">Fecha de entrega</Label><Input type="date" value={form.due_date} onChange={(e) => set("due_date")(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Estado</Label>
                <Select value={form.status} onValueChange={set("status")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Responsable</Label>
              <Select value={form.assignee_person_id || "none"} onValueChange={(v) => set("assignee_person_id")(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin responsable</SelectItem>
                  {(peopleQ.data ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter className="sm:justify-between">
          <ConfirmDeleteButton title="¿Eliminar esta tarea?" onConfirm={remove} disabled={!form} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
