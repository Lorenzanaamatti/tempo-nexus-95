import { createFileRoute } from "@tanstack/react-router";
import { PartnersView } from "@/components/partners-view";

export const Route = createFileRoute("/_authenticated/_admin/partners/plataformas")({
  component: () => (
    <PartnersView
      tipo="Plataforma"
      title="PLATAFORMAS"
      description="Amazon Prime, Disney+, Atresmedia, HBO, Apple TV, Filmin, Movistar+ y otras plataformas y cadenas."
    />
  ),
});
