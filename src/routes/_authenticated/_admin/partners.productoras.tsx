import { createFileRoute } from "@tanstack/react-router";
import { PartnersView } from "@/components/partners-view";

export const Route = createFileRoute("/_authenticated/_admin/partners/productoras")({
  component: () => (
    <PartnersView
      tipo="Productora"
      title="PRODUCTORAS"
      description="Productoras de cine, televisión, publicidad, animación y documental con las que trabajamos."
    />
  ),
});