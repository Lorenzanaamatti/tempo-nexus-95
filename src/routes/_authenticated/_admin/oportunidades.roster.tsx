import { createFileRoute } from "@tanstack/react-router";
import { OpportunitiesList } from "@/components/opportunities-list";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/roster")({
  component: OportunidadesRoster,
});

function OportunidadesRoster() {
  return (
    <OpportunitiesList
      fixedKinds={["fichaje"]}
      listKey="oportunidades-roster"
      eyebrow="OPORTUNIDADES DE VENTAS · ROSTER"
      title="OPORTUNIDADES · ROSTER"
      description="Fichajes potenciales y oportunidades de incorporación de nuevo talento al roster."
    />
  );
}
