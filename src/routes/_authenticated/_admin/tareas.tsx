import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TASK_AREAS, TASK_AREA_LABEL, TASK_AREA_TONE, type TaskArea } from "@/lib/task-areas";
import { useNewTaskDialog } from "@/components/new-task-dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/tareas")({
  component: TareasPage,
});

function TareasPage() {
  const { user } = useAuth();
  const { open: openNewTask } = useNewTaskDialog();
  const qc = useQueryClient();
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"pending" | "done" | "all">("pending");

  const personQ = useQuery({
    queryKey: ["my-person-id", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: byUser } = await (supabase as any)
        .from("people").select("id").eq("user_id", user!.id).maybeSingle();
      if (byUser?.id) return byUser.id as string;
      const { data: prof } = await supabase
        .from("profiles").select("composer_id").eq("id", user!.id).maybeSingle();
      if (!prof?.composer_id) return null;
      const { data: byComp } = await (supabase as any)
        .from("people").select("id").eq("composer_id", prof.composer_id).maybeSingle();
      return (byComp?.id as string) ?? null;
    },
  });
  const personId = personQ.data;

  const baseSelect = "id, title, area, subarea, due_date, entry_date, done, done_at, created_at, assignee:people!actions_assignee_person_id_fkey(id, full_name)";

  const assignedQ = useQuery({
    queryKey: ["tasks", "assigned", personId, areaFilter, statusFilter],
    enabled: !!personId,
    queryFn: async () => {
      let q = (supabase as any).from("actions").select(baseSelect).eq("assignee_person_id", personId);
      if (areaFilter !== "all") q = q.eq("area", areaFilter);
      if (statusFilter === "pending") q = q.eq("done", false);
      if (statusFilter === "done") q = q.eq("done", true);
      const { data, error } = await q.order("done").order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      if (error) {
        const { data: d2 } = await (supabase as any).from("actions").select("*").eq("assignee_person_id", personId);
        return d2 ?? [];
      }
      return data ?? [];
    },
  });

  const createdQ = useQuery({
    queryKey: ["tasks", "created", user?.id, areaFilter, statusFilter],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = (supabase as any).from("actions").select(baseSelect).eq("requester_user_id", user!.id);
      if (areaFilter !== "all") q = q.eq("area", areaFilter);
      if (statusFilter === "pending") q = q.eq("done", false);
      if (statusFilter === "done") q = q.eq("done", true);
      const { data, error } = await q.order("done").order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  async function toggle(id: string, done: boolean) {
    const { error } = await (supabase as any)
      .from("actions")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["task-inbox"] });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Tareas</h1>
          <p className="text-sm text-muted-foreground">Las que te han delegado y las que has creado.</p>
        </div>
        <Button onClick={() => openNewTask()}><Plus className="mr-1 h-4 w-4" /> Nueva tarea</Button>
      </div>

      {!personId && (
        <div className="mb-4 rounded-sm border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Tu usuario aún no está enlazado a una persona del equipo. Un administrador debe asociarte desde Equipo IC para recibir tareas.
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <span className="block smallcaps text-[10px] text-muted-foreground">Área</span>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {TASK_AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="block smallcaps text-[10px] text-muted-foreground">Estado</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="done">Hechas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="assigned">
        <TabsList>
          <TabsTrigger value="assigned">Asignadas a mí ({assignedQ.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="created">Creadas por mí ({createdQ.data?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="assigned">
          <TaskList rows={assignedQ.data ?? []} onToggle={toggle} />
        </TabsContent>
        <TabsContent value="created">
          <TaskList rows={createdQ.data ?? []} onToggle={toggle} showAssignee />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskList({
  rows, onToggle, showAssignee,
}: { rows: any[]; onToggle: (id: string, done: boolean) => void; showAssignee?: boolean }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin tareas en esta vista.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-sm border border-border">
      {rows.map((t) => (
        <li key={t.id} className={`flex items-start gap-3 px-3 py-3 ${t.done ? "opacity-60" : ""}`}>
          <Checkbox checked={t.done} onCheckedChange={(v) => onToggle(t.id, !!v)} />
          <div className="flex-1">
            <p className={`text-sm ${t.done ? "line-through" : ""}`}>{t.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
              {t.area && (
                <span className={`rounded-sm px-1.5 py-0.5 smallcaps ${TASK_AREA_TONE[t.area as TaskArea]}`}>
                  {TASK_AREA_LABEL[t.area as TaskArea]}
                </span>
              )}
              {t.subarea && <span className="text-muted-foreground">{t.subarea}</span>}
              {t.due_date && <span className="text-muted-foreground">· entrega {t.due_date}</span>}
              {t.entry_date && <span className="text-muted-foreground">· entrada {t.entry_date}</span>}
              {showAssignee && t.assignee?.full_name && (
                <span className="text-muted-foreground">· {t.assignee.full_name}</span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}