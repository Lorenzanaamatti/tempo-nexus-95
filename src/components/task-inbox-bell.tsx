import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMemo } from "react";
import { TASK_AREA_LABEL, type TaskArea } from "@/lib/task-areas";

function lastSeenKey(userId: string) {
  return `tasks-last-seen-${userId}`;
}

export function TaskInboxBell() {
  const { user } = useAuth();

  // Find the person row linked to this user (via people.user_id or via composer)
  const personQ = useQuery({
    queryKey: ["my-person-id", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: byUser } = await (supabase as any)
        .from("people").select("id").eq("user_id", user!.id).maybeSingle();
      if (byUser?.id) return byUser.id as string;
      // fallback via composer
      const { data: prof } = await supabase
        .from("profiles").select("composer_id").eq("id", user!.id).maybeSingle();
      if (!prof?.composer_id) return null;
      const { data: byComp } = await (supabase as any)
        .from("people").select("id").eq("composer_id", prof.composer_id).maybeSingle();
      return (byComp?.id as string) ?? null;
    },
  });
  const personId = personQ.data;

  const lastSeen = useMemo(() => {
    if (!user?.id) return null;
    try { return localStorage.getItem(lastSeenKey(user.id)); } catch { return null; }
  }, [user?.id]);

  const inboxQ = useQuery({
    queryKey: ["task-inbox", personId],
    enabled: !!personId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("actions")
        .select("id, title, area, subarea, created_at, due_date")
        .eq("assignee_person_id", personId)
        .eq("done", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const newOnes = useMemo(() => {
    if (!inboxQ.data) return [];
    if (!lastSeen) return inboxQ.data;
    return inboxQ.data.filter((t: any) => t.created_at > lastSeen);
  }, [inboxQ.data, lastSeen]);

  const count = newOnes.length;

  function markSeen() {
    if (!user?.id) return;
    try { localStorage.setItem(lastSeenKey(user.id), new Date().toISOString()); } catch {}
    inboxQ.refetch();
  }

  if (!personId) return null;

  return (
    <Popover onOpenChange={(o) => { if (!o) markSeen(); }}>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Buzón de tareas"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-medium text-white">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="font-display text-sm">Tareas asignadas a mí</p>
          <p className="text-[11px] text-muted-foreground">
            {count > 0 ? `${count} nueva${count === 1 ? "" : "s"} desde tu última visita` : "Todo al día"}
          </p>
        </div>
        <ul className="max-h-80 divide-y divide-border overflow-auto">
          {(inboxQ.data ?? []).slice(0, 8).map((t: any) => (
            <li key={t.id} className="px-3 py-2 text-sm">
              <p className="line-clamp-2">{t.title}</p>
              <div className="mt-0.5 flex gap-2 smallcaps text-[10px] text-muted-foreground">
                {t.area && <span>{TASK_AREA_LABEL[t.area as TaskArea]}</span>}
                {t.subarea && <span>· {t.subarea}</span>}
                {t.due_date && <span>· vence {t.due_date}</span>}
              </div>
            </li>
          ))}
          {(!inboxQ.data || inboxQ.data.length === 0) && (
            <li className="px-3 py-4 text-sm text-muted-foreground">No tienes tareas pendientes.</li>
          )}
        </ul>
        <div className="border-t border-border px-3 py-2 text-right">
          <Link to="/tareas" className="text-xs underline">Ver todas</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}