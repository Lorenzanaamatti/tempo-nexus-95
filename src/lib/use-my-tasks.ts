import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { todayISO } from "@/lib/task-status";

/** Persona del equipo (people) enlazada al usuario actual. */
export function useMyPersonId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-person-id", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: byUser } = await (supabase as any)
        .from("people").select("id").eq("user_id", user!.id).maybeSingle();
      if (byUser?.id) return byUser.id as string;
      const { data: prof } = await supabase
        .from("profiles").select("composer_id").eq("id", user!.id).maybeSingle();
      if (prof?.composer_id) {
        const { data: byComp } = await (supabase as any)
          .from("people").select("id").eq("composer_id", prof.composer_id).maybeSingle();
        if (byComp?.id) return byComp.id as string;
      }
      // Último recurso: ficha cuyo email coincide con el login
      // (p. ej. Lourdes con lourdes@plus-music.com). Si hay fichas duplicadas
      // con el mismo email, priorizamos la que ya tiene login enlazado.
      const email = user!.email?.trim().toLowerCase();
      if (!email) return null;
      const { data: byEmail } = await (supabase as any)
        .from("people").select("id")
        .ilike("email", email)
        .order("user_id", { ascending: false, nullsFirst: false })
        .limit(1).maybeSingle();
      return (byEmail?.id as string) ?? null;
    },
  });
}

/**
 * Tareas pendientes acumuladas (vencidas) o que vencen hoy, entre las que me
 * han asignado y las que yo misma me he asignado / he creado.
 */
export function useMyDueTaskCount() {
  const { user } = useAuth();
  const personQ = useMyPersonId();
  const personId = personQ.data ?? null;

  return useQuery({
    queryKey: ["my-due-tasks", user?.id, personId],
    enabled: !!user?.id,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const today = todayISO();
      const filters = [
        personId ? `assignee_person_id.eq.${personId}` : null,
        `requester_user_id.eq.${user!.id}`,
      ].filter(Boolean) as string[];
      const { count, error } = await (supabase as any)
        .from("actions")
        .select("id", { count: "exact", head: true })
        .eq("done", false)
        .lte("due_date", today)
        .or(filters.join(","));
      if (error) return 0;
      return count ?? 0;
    },
  });
}
