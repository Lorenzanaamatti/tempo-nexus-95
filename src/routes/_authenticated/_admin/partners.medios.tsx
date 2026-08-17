import { createFileRoute } from "@tanstack/react-router";
import { PartnersView } from "@/components/partners-view";

export const Route = createFileRoute("/_authenticated/_admin/partners/medios")({
  component: () => (
    <PartnersView
      tipo="Medio"
      title="MEDIOS"
      description="Plataformas, televisiones, radios, prensa y medios digitales relevantes para la difusión."
    />
  ),
});