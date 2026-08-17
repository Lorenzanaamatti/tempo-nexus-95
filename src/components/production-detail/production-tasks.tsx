import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/list-states";
import { useNewTaskDialog } from "@/components/new-task-dialog";
import { formatDateEs } from "@/lib/dates";
import { TASK_STATUS_LABEL } from "@/lib/task-status";
import { toast } from "sonner";
import { Plus, CheckCircle2 } from "lucide-react";

export function ProductionTasks({ productionId, productionTitle }: { productionId: string; productionTitle: string }) {
  const qc = useQueryClient();
  const { open } = useNewTaskDialog();

  const tasksQ = useQuery({
    queryKey: ["production-tasks", productionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("actions")
        .select("id, title, due_date, done, status, assignee:people!actions_assignee_person_id_fkey(id, full_name)")
        .eq("production_id", productionId)
        .order("done")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function toggle(id: string, done: boolean) {
    const { error } = await (supabase as any).from("actions").update({ status: done ? "hecha" : "pendiente" }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["production-tasks", productionId] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  const rows = tasksQ.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => open({ production: { id: productionId, title: productionTitle } })}>
          <Plus className="mr-1 h-4 w-4" /> Nueva tarea
        </Button>
      </div>
      {!rows.length ? (
        <EmptyState variant="inline" icon={CheckCircle2} title="Sin tareas vinculadas" description="Crea tareas asociadas a esta producción." />
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {rows.map((t: any) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <Checkbox checked={t.done} onCheckedChange={(v) => toggle(t.id, !!v)} />
              <span className={t.done ? "line-through opacity-60" : ""}>{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.assignee?.full_name ?? "Sin responsable"}</span>
              <span className="text-xs text-muted-foreground">Entrega {formatDateEs(t.due_date)}</span>
              <span className="ml-auto rounded-sm bg-muted px-1.5 py-0.5 text-[10px] smallcaps">
                {TASK_STATUS_LABEL[t.status as keyof typeof TASK_STATUS_LABEL] ?? t.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}