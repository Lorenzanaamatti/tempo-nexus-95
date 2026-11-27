import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, CheckSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchComposerProductions } from "@/lib/composer-productions";
import { normalizeMilestoneStatus } from "@/lib/production-milestones";
import { ACTIVE_PRODUCTION_STATUSES } from "@/lib/portal-constants";
import { formatDateEs } from "@/lib/dates";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Inicio del portal: entregas destacadas a 10 días, fases retrasadas y tareas que BIG C asigna al artista. */
export function PortalUpcoming({ composerId }: { composerId: string }) {
  const qc = useQueryClient();
  const today = new Date();
  const limit = new Date(today); limit.setDate(today.getDate() + 10);
  const t0 = iso(today), t10 = iso(limit);

  const { data } = useQuery({
    queryKey: ["portal-upcoming", composerId, t0],
    queryFn: async () => {
      const prods = (await fetchComposerProductions<{ id: string; title: string; status: string }>(composerId, "id, title, status"))
        .filter((p) => ACTIVE_PRODUCTION_STATUSES.has(p.status));
      const byId = new Map(prods.map((p) => [p.id, p.title]));
      const [{ data: phases }, { data: tasks }] = await Promise.all([
        prods.length
          ? supabase.from("production_phases").select("id, production_id, name, start_date, end_date, status, is_milestone").in("production_id", prods.map((p) => p.id))
          : Promise.resolve({ data: [] as any[] }),
        (supabase as any).rpc("portal_my_tasks", { _composer_id: composerId }),
      ]);
      const all = (phases ?? []).map((ph: any) => ({ ...ph, title: byId.get(ph.production_id) ?? "" }));
      const hitos = all
        .filter((ph: any) => ph.is_milestone && normalizeMilestoneStatus(ph.status) !== "completado")
        .filter((ph: any) => { const d = ph.end_date ?? ph.start_date; return d && d >= t0 && d <= t10; })
        .sort((a: any, b: any) => (a.end_date ?? a.start_date).localeCompare(b.end_date ?? b.start_date));
      const late = all.filter((ph: any) => normalizeMilestoneStatus(ph.status) === "retrasado");
      return { hitos, late, tasks: (tasks ?? []) as { id: string; title: string; due_date: string | null; done: boolean; production_title: string | null }[] };
    },
  });

  async function toggle(id: string, done: boolean) {
    const { error } = await (supabase as any).rpc("portal_set_task_done", { _task_id: id, _done: done });
    if (error) return toast.error("No se pudo actualizar la tarea");
    qc.invalidateQueries({ queryKey: ["portal-upcoming", composerId] });
  }

  const box = "border border-[color:var(--portal-border)] bg-[color:var(--portal-surface)] p-6";
  const label = "smallcaps text-[10px] text-[color:var(--accent-coral)]";
  const openTasks = (data?.tasks ?? []).filter((t) => !t.done);
  const doneTasks = (data?.tasks ?? []).filter((t) => t.done).slice(0, 5);

  return (
    <div className="space-y-4">
      {!!data?.late.length && (
        <section className="border border-destructive bg-destructive/5 p-5">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" aria-hidden />Fases retrasadas</p>
          <ul className="mt-2 space-y-1 text-sm">
            {data.late.map((ph: any) => <li key={ph.id}><span className="font-medium">{ph.title}</span> · {ph.name} <span className="text-[color:var(--portal-muted)]">({formatDateEs(ph.end_date ?? ph.start_date)})</span></li>)}
          </ul>
        </section>
      )}
      <section className={box}>
        <p className={label}>Próximos hitos · 10 días</p>
        {!data?.hitos.length ? (
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-[color:var(--portal-muted)]"><CalendarDays className="h-4 w-4" aria-hidden />No hay entregas destacadas en los próximos 10 días.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.hitos.map((ph: any) => (
              <li key={ph.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
                <span className="min-w-0"><Star className="mr-1 inline h-3.5 w-3.5 text-[color:var(--accent-coral)]" aria-hidden /><span className="font-medium">{ph.name}</span> · {ph.title}</span>
                <span className="font-mono text-xs text-[color:var(--portal-muted)]">{formatDateEs(ph.end_date ?? ph.start_date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={box}>
        <p className={label}>Tus tareas</p>
        {!openTasks.length && !doneTasks.length ? (
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-[color:var(--portal-muted)]"><CheckSquare className="h-4 w-4" aria-hidden />El equipo no te ha asignado tareas.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {[...openTasks, ...doneTasks].map((t) => (
              <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                <Checkbox checked={t.done} onCheckedChange={(v) => toggle(t.id, v === true)} aria-label={`Marcar «${t.title}» como hecha`} />
                <span className={`min-w-0 ${t.done ? "text-[color:var(--portal-muted)] line-through" : ""}`}>{t.title}{t.production_title ? <span className="text-[color:var(--portal-muted)]"> · {t.production_title}</span> : null}</span>
                <span className="font-mono text-xs text-[color:var(--portal-muted)]">{formatDateEs(t.due_date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
