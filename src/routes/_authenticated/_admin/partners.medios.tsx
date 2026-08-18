import { createFileRoute } from "@tanstack/react-router";
import { PartnersView } from "@/components/partners-view";
import { MediosImportDialog } from "@/components/medios-import-dialog";

export const Route = createFileRoute("/_authenticated/_admin/partners/medios")({
  head: () => ({
    meta: [
      { title: "Medios · Partners | Interesante Compañía" },
      { name: "description", content: "CRM de medios de comunicación: prensa, radio, televisión y medios digitales." },
      { property: "og:title", content: "Medios · Partners" },
      { property: "og:description", content: "CRM de medios de comunicación de Interesante Compañía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PartnersView
      tipo="Medio"
      title="MEDIOS"
      description="Televisiones, radios, prensa y medios digitales relevantes para la difusión."
      actions={<MediosImportDialog />}
    />
  ),
});
