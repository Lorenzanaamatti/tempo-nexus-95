import { createFileRoute } from "@tanstack/react-router";
import { OpportunitiesList } from "@/components/opportunities-list";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/producciones")({
  component: OportunidadesProducciones,
});

function OportunidadesProducciones() {
  return (
    <OpportunitiesList
      fixedKinds={["pitch"]}
      listKey="oportunidades-producciones"
      eyebrow="OPORTUNIDADES DE VENTAS · PRODUCCIONES"
      title="OPORTUNIDADES · PRODUCCIONES"
      description="Oportunidades abiertas de entrar en una producción cinematográfica, televisiva o publicitaria."
    />
  );
}
