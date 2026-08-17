import { createFileRoute } from "@tanstack/react-router";
import { OpportunitiesList } from "@/components/opportunities-list";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/partners")({
  component: OportunidadesPartners,
});

function OportunidadesPartners() {
  return (
    <OpportunitiesList
      fixedKinds={["presentar_ic", "fichaje_productora"]}
      listKey="oportunidades-partners"
      eyebrow="OPORTUNIDADES DE VENTAS · PARTNERS"
      title="OPORTUNIDADES · PARTNERS"
      description="Oportunidades con productoras, plataformas y otros partners estratégicos."
    />
  );
}
