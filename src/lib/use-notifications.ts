import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  action_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, kind, title, body, link, action_id, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/** Aceptar o rechazar una tarea que me han asignado. */
export function useRespondAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ actionId, accept, note }: { actionId: string; accept: boolean; note?: string }) => {
      const { error } = await (supabase as any)
        .from("actions")
        .update({
          assignment_status: accept ? "aceptada" : "rechazada",
          assignment_note: note ?? null,
          ...(accept ? {} : { assignee_person_id: null }),
        })
        .eq("id", actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["pending-assignments"] });
      qc.invalidateQueries({ queryKey: ["my-due-tasks"] });
    },
  });
}

/** Tareas asignadas a mí que aún no he aceptado. */
export function usePendingAssignments(personId: string | null) {
  return useQuery({
    queryKey: ["pending-assignments", personId],
    enabled: !!personId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("actions")
        .select("id, title, notes, area, subarea, due_date, created_at")
        .eq("assignee_person_id", personId)
        .eq("assignment_status", "propuesta")
        .eq("done", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; title: string; notes: string | null; area: string | null;
        subarea: string | null; due_date: string | null; created_at: string;
      }>;
    },
  });
}
