import { createFileRoute } from "@tanstack/react-router";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { CareerPlanSection } from "@/components/career-plan/career-plan-section";

export const Route = createFileRoute("/_authenticated/portal/plan")({
  component: PortalPlan,
});

function PortalPlan() {
  const { composerId } = usePortalComposer();

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-3xl">Mi plan de carrera</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Objetivos acordados con tu agente, avance del año en curso y estado de tu presencia digital. Vista de solo lectura:
          para cualquier cambio, habla con tu agente.
        </p>
      </header>
      {composerId ? (
        <CareerPlanSection composerId={composerId} canEdit={false} mode="portal" />
      ) : (
        <p className="text-sm text-muted-foreground">No hay representado seleccionado.</p>
      )}
    </div>
  );
}
