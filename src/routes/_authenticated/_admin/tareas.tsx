import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TASK_AREAS, TASK_AREA_LABEL, TASK_AREA_TONE, type TaskArea } from "@/lib/task-areas";
import { TASK_STATUSES, TASK_STATUS_LABEL, TASK_STATUS_TONE, todayISO, type TaskStatus } from "@/lib/task-status";
import { useMyPersonId, useMyDueTaskCount } from "@/lib/use-my-tasks";
import { useNewTaskDialog } from "@/components/new-task-dialog";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { toast } from "sonner";
import { Plus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_admin/tareas")({
  component: TareasPage,
});

type Row = {
  id: string;
  title: string;
  area: TaskArea | null;
  subarea: string | null;
  entry_date: string | null;
  due_date: string | null;
  status: TaskStatus;
  done: boolean;
  assignee_person_id: string | null;
  assignee?: { id: string; full_name: string } | null;
};

const SELECT =
  "id, title, area, subarea, entry_date, due_date, status, done, assignee_person_id, assignee:people!actions_assignee_person_id_fkey(id, full_name)";

function TareasPage() {
  const { user } = useAuth();
  const { open: openNewTask } = useNewTaskDialog();
  const qc = useQueryClient();
  const personId = useMyPersonId().data ?? null;
  const dueCount = useMyDueTaskCount().data ?? 0;

  const [mine, setMine] = useState(true);
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [q, setQ] = useState("");

  const peopleQ = useQuery({
    queryKey: ["people-ic-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people").select("id, full_name").eq("role", "ic_team").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const tasksQ = useQuery({
    queryKey: ["tasks", mine, personId, user?.id, areaFilter, statusFilter],
    queryFn: async () => {
      let query = (supabase as any).from("actions").select(SELECT).eq("kind", "tarea");
      if (mine) {
        const filters = [
          personId ? `assignee_person_id.eq.${personId}` : null,
          user?.id ? `requester_user_id.eq.${user.id}` : null,
        ].filter(Boolean) as string[];
        if (!filters.length) return [] as Row[];
        query = query.or(filters.join(","));
      }
      if (areaFilter !== "all") query = query.eq("area", areaFilter);
      if (statusFilter === "pending") query = query.eq("done", false);
      else if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query
        .order("done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const needle = q.trim().toLowerCase();
  const rows = (tasksQ.data ?? []).filter(
    (t) => !needle || [t.title, t.subarea, t.assignee?.full_name].some((v) => (v ?? "").toLowerCase().includes(needle)),
  );

  async function patch(id: string, values: Record<string, unknown>) {
    const { error } = await (supabase as any).from("actions").update(values).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["my-due-tasks"] });
    qc.invalidateQueries({ queryKey: ["task-inbox"] });
  }

  const today = todayISO();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="smallcaps text-muted-foreground">Tareas</p>
          <h1 className="font-display text-4xl title-caps">Qué hay que hacer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Área, responsable, fecha de entrada, fecha de entrega y estado en una sola lista.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-sm border border-primary/40 bg-primary/10 px-3 py-2 text-center">
            <div className="font-display text-2xl leading-none text-primary">{dueCount}</div>
            <div className="smallcaps text-[10px] text-muted-foreground">pendientes hoy</div>
          </div>
          <Button onClick={() => openNewTask()}><Plus className="mr-1 h-4 w-4" /> Nueva tarea</Button>
        </div>
      </div>

      {!personId && (
        <div className="mb-4 rounded-sm border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Tu usuario aún no está enlazado a una persona del equipo. Un administrador debe asociarte desde Equipo IC para recibir tareas.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="inline-flex overflow-hidden rounded-sm border border-border">
          <button
            type="button"
            onClick={() => setMine(true)}
            className={cn("px-3 py-1.5 text-xs smallcaps", mine ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            Mis tareas
          </button>
          <button
            type="button"
            onClick={() => setMine(false)}
            className={cn("px-3 py-1.5 text-xs smallcaps", !mine ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            Todas
          </button>
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {TASK_AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Sin terminar</SelectItem>
            {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            <SelectItem value="all">Todos los estados</SelectItem>
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tarea…" className="h-8 max-w-[220px] text-sm" />
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} tarea(s)</span>
      </div>

      {tasksQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : !rows.length ? (
        <EmptyState icon={CheckCircle2} title="Todo al día" description="No hay tareas pendientes con los filtros actuales." action={{ label: "Nueva tarea", onClick: () => openNewTask() }} secondaryAction={mine ? { label: "Ver todas", onClick: () => setMine(false) } : undefined} />
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {rows.map((t) => {
            const overdue = !t.done && t.due_date && t.due_date < today;
            const dueToday = !t.done && t.due_date === today;
            return (
              <li key={t.id} className={cn("px-3 py-3", t.done && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={t.done}
                    onCheckedChange={(v) => patch(t.id, { status: v ? "hecha" : "pendiente" })}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", t.done && "line-through")}>{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {t.area && (
                        <span className={cn("rounded-sm px-1.5 py-0.5 smallcaps", TASK_AREA_TONE[t.area])}>
                          {TASK_AREA_LABEL[t.area]}
                        </span>
                      )}
                      {t.subarea && <span className="text-muted-foreground">{t.subarea}</span>}
                      <span className={cn("rounded-sm px-1.5 py-0.5 smallcaps", TASK_STATUS_TONE[t.status] ?? "")}>
                        {TASK_STATUS_LABEL[t.status] ?? t.status}
                      </span>
                      <span className="text-muted-foreground">Entrada {t.entry_date ?? "—"}</span>
                      <span className={cn("text-muted-foreground", overdue && "text-destructive", dueToday && "text-primary")}>
                        Entrega {t.due_date ?? "—"}
                        {overdue ? " · vencida" : dueToday ? " · hoy" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <Select
                      value={t.assignee_person_id ?? "none"}
                      onValueChange={(v) => patch(t.id, { assignee_person_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue placeholder="Responsable" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin responsable</SelectItem>
                        {(peopleQ.data ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={t.status} onValueChange={(v) => patch(t.id, { status: v })}>
                      <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={t.due_date ?? ""}
                      onChange={(e) => patch(t.id, { due_date: e.target.value || null })}
                      className="h-7 w-[140px] text-xs"
                      title="Fecha de entrega"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
