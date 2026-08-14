import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** All queries + mutations backing the calendar board. */
export function useCalendarBoardData({
  userId,
  userEmail,
  startIso,
  endIso,
  enableUnlinkedPeople,
}: {
  userId: string | undefined;
  userEmail: string | undefined;
  startIso: string;
  endIso: string;
  enableUnlinkedPeople: boolean;
}) {
  const queryClient = useQueryClient();

  // Match current user to a `people` row: user_id link first, then email.
  const myPersonQ = useQuery({
    queryKey: ["calendar-my-person", userId, userEmail],
    enabled: !!userId,
    queryFn: async () => {
      const byId = await supabase.from("people").select("id, full_name").eq("user_id", userId!).maybeSingle();
      if (byId.data) return byId.data;
      if (userEmail) {
        const byEmail = await supabase.from("people").select("id, full_name").ilike("email", userEmail).maybeSingle();
        return byEmail.data ?? null;
      }
      return null;
    },
  });

  // Candidates to self-link when the current user has no `people` row yet.
  const unlinkedPeopleQ = useQuery({
    queryKey: ["calendar-unlinked-people"],
    enabled: !!userId && !myPersonQ.data && enableUnlinkedPeople,
    queryFn: async () => {
      const { data } = await supabase.from("people").select("id, full_name, role").is("user_id", null).order("full_name");
      return data ?? [];
    },
  });

  const linkMeMut = useMutation({
    mutationFn: async (personId: string) => {
      const { error } = await supabase.from("people").update({ user_id: userId! }).eq("id", personId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-my-person"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-unlinked-people"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-people-min"] });
      toast.success("Vinculado a tu usuario");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "No se pudo vincular");
    },
  });

  // Single source of truth: calendar_events. Triggers mirror actions,
  // contracts, opportunities, productions, sprints and composer onboarding.
  const eventsQ = useQuery({
    queryKey: ["calendar-events-all", startIso, endIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .lte("start_date", endIso)
        .gte("end_date", startIso);
      if (error) throw error;
      return data ?? [];
    },
  });

  // composer_availability has no calendar_events mirror yet; merge as virtual.
  const composerAvailQ = useQuery({
    queryKey: ["calendar-composer-availability", startIso, endIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composer_availability")
        .select("id, kind, start_date, end_date, note, composer_id")
        .lte("start_date", endIso)
        .gte("end_date", startIso);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Subject name lookups (small tables, cached aggressively).
  const composersQ = useQuery({
    queryKey: ["calendar-composers-min"],
    queryFn: async () => (await supabase.from("composers").select("id, full_name")).data ?? [],
  });
  const peopleQ = useQuery({
    queryKey: ["calendar-people-min"],
    queryFn: async () => (await supabase.from("people").select("id, full_name, role, composer_id")).data ?? [],
  });
  const productionsQ = useQuery({
    queryKey: ["calendar-productions-min"],
    queryFn: async () => (await supabase.from("productions").select("id, title")).data ?? [],
  });
  const opportunitiesQ = useQuery({
    queryKey: ["calendar-opportunities-min"],
    queryFn: async () => (await supabase.from("opportunities").select("id, title, partner_name")).data ?? [],
  });
  const contractsQ = useQuery({
    queryKey: ["calendar-contracts-min"],
    queryFn: async () => (await supabase.from("contracts").select("id, title, counterparty")).data ?? [],
  });
  const targetAccountsQ = useQuery({
    queryKey: ["calendar-target-accounts-min"],
    queryFn: async () => (await supabase.from("target_accounts").select("id, name")).data ?? [],
  });
  const actionsQ = useQuery({
    queryKey: ["calendar-actions-min"],
    queryFn: async () => (await supabase.from("actions").select("id, area, subarea, notes")).data ?? [],
  });
  const oppActionsQ = useQuery({
    queryKey: ["calendar-opportunity-actions-min"],
    queryFn: async () => (await supabase.from("opportunity_actions").select("id")).data ?? [],
  });
  const phasesQ = useQuery({
    queryKey: ["calendar-production-phases-min"],
    queryFn: async () => (await supabase.from("production_phases").select("id")).data ?? [],
  });
  const sprintsQ = useQuery({
    queryKey: ["calendar-production-billing-sprints-min"],
    queryFn: async () => (await supabase.from("production_billing_sprints").select("id")).data ?? [],
  });

  const moveTaskMut = useMutation({
    mutationFn: async ({ actionId, newDate }: { actionId: string; newDate: string }) => {
      const { error } = await supabase.from("actions").update({ due_date: newDate }).eq("id", actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events-all"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-inbox"] });
      toast.success("Fecha de entrega actualizada");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "No se pudo mover la tarea");
    },
  });

  const loading =
    eventsQ.isLoading || composerAvailQ.isLoading || peopleQ.isLoading || composersQ.isLoading ||
    productionsQ.isLoading || opportunitiesQ.isLoading || contractsQ.isLoading || targetAccountsQ.isLoading ||
    actionsQ.isLoading || oppActionsQ.isLoading || phasesQ.isLoading || sprintsQ.isLoading;

  return {
    myPersonQ, unlinkedPeopleQ, linkMeMut, moveTaskMut, loading,
    eventsQ, composerAvailQ, peopleQ, composersQ, productionsQ, opportunitiesQ,
    contractsQ, targetAccountsQ, actionsQ, oppActionsQ, phasesQ, sprintsQ,
  };
}
