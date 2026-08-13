import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, CalendarClock, Inbox, UserPlus } from "lucide-react";

/**
 * "Qué me toca hoy": pendientes reales del usuario en una sola tarjeta.
 * Fuente única: calendar_events asignados a mi persona del equipo.
 */
export function TodayPanel({ isBigC }: { isBigC: boolean }) {
  const { user } = useAuth();

  const { data: myPersonId } = useQuery({
    queryKey: ["today-my-person", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("people")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  const { data: tasks = [] } = useQuery({
    queryKey: ["today-tasks", myPersonId, today],
    enabled: !!myPersonId,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("calendar_events")
        .select("id, title, start_date, kind, subject_type")
        .eq("assignee_person_id", myPersonId)
        .lte("start_date", in7)
        .order("start_date")
        .limit(12);
      return (data ?? []) as any[];
    },
  });

  const { data: pendingUsers = 0 } = useQuery({
    queryKey: ["today-pending-users"],
    enabled: isBigC,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const { data: openCandidacies = 0 } = useQuery({
    queryKey: ["today-open-candidacies"],
    refetchInterval: 120_000,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("candidacies")
        .select("id", { count: "exact", head: true })
        .in("status", ["pendiente", "en_revision"]);
      return count ?? 0;
    },
  });

  const overdue = tasks.filter((t) => t.start_date < today);
  const upcoming = tasks.filter((t) => t.start_date >= today);

  return (
    <section className="mb-10 rounded-sm border border-border">
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-3">
        <h2 className="font-display text-xl">Qué me toca hoy</h2>
        <div className="ml-auto flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-primary" />
            {overdue.length} vencidas
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {upcoming.length} en 7 días
          </span>
          <Link to="/candidacies" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Inbox className="h-3.5 w-3.5" />
            {openCandidacies} candidaturas abiertas
          </Link>
          {isBigC && pendingUsers > 0 && (
            <Link to="/users" className="flex items-center gap-1.5 font-medium text-primary">
              <UserPlus className="h-3.5 w-3.5" />
              {pendingUsers} altas por aprobar
            </Link>
          )}
        </div>
      </div>

      {!myPersonId ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Tu usuario aún no está vinculado a una persona del equipo. Vincúlalo desde{" "}
          <Link to="/calendar" search={{ view: "personal" } as never} className="underline">
            el calendario personal
          </Link>{" "}
          para ver aquí tus pendientes.
        </p>
      ) : tasks.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">No tienes pendientes asignados esta semana.</p>
      ) : (
        <ul className="divide-y divide-border">
          {[...overdue, ...upcoming].slice(0, 8).map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span
                className={
                  "w-24 shrink-0 text-xs " + (t.start_date < today ? "font-medium text-primary" : "text-muted-foreground")
                }
              >
                {t.start_date}
              </span>
              <span className="flex-1 truncate">{t.title}</span>
              {t.kind && <span className="smallcaps shrink-0 text-[10px] text-muted-foreground">{t.kind}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-border px-5 py-2">
        <Link to="/calendar" search={{ view: "personal" } as never} className="text-xs text-muted-foreground hover:text-foreground">
          Ver todos mis pendientes →
        </Link>
      </div>
    </section>
  );
}
