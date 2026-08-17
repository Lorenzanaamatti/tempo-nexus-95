import { createFileRoute } from "@tanstack/react-router";
import { PartnersView } from "@/components/partners-view";

export const Route = createFileRoute("/_authenticated/_admin/partners/")({
  component: () => (
    <PartnersView
      title="PARTNERS"
      description="Productoras, medios e instituciones con las que trabaja Interesante Compañía, en una única lista."
    />
  ),
});
