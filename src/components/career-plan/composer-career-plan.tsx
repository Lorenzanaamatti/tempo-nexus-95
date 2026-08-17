import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCurrentRole } from "@/lib/use-role";
import { CareerPlanSection } from "@/components/career-plan/career-plan-section";

/**
 * Plan de carrera dentro de la ficha del representado.
 * Editan: BIG C y la persona del equipo asignada como agente responsable.
 * El resto del equipo lo ve en solo lectura.
 */
export function ComposerCareerPlan({ composerId, agentPersonId }: { composerId: string; agentPersonId: string | null }) {
  const { user } = useAuth();
  const { isBigC } = useCurrentRole();

  const { data: myPersonId } = useQuery({
    queryKey: ["my-person-id", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("people").select("id").eq("user_id", user!.id).maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
  });

  const canEdit = isBigC || (!!agentPersonId && !!myPersonId && agentPersonId === myPersonId);

  return (
    <div className="space-y-6">
      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          Solo BIG C y el agente responsable de este representado pueden editar el plan.
        </p>
      )}
      <CareerPlanSection composerId={composerId} canEdit={canEdit} isBigC={isBigC} mode="ficha" />
    </div>
  );
}
