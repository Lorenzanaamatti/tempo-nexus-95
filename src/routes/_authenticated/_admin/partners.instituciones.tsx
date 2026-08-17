import { createFileRoute } from "@tanstack/react-router";
import { PartnersView } from "@/components/partners-view";

export const Route = createFileRoute("/_authenticated/_admin/partners/instituciones")({
  component: () => (
    <PartnersView
      tipo="Institución"
      title="INSTITUCIONES"
      description="Instituciones públicas, fundaciones, asociaciones, entidades de gestión y organismos internacionales."
    />
  ),
});