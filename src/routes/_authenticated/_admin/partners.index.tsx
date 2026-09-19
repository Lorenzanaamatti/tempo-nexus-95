import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/partners/")({
  component: PartnersLanding,
  head: () => ({ meta: [
    { title: "Partners | Interesante Compañía" },
    { name: "description", content: "Accesos a productoras, plataformas, medios, instituciones y actividad internacional." },
    { property: "og:title", content: "Partners | Interesante Compañía" },
    { property: "og:description", content: "Relaciones profesionales y oportunidades de colaboración de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function PartnersLanding() {
  return <GroupLanding groupLabel="Partners" description="Elige el tipo de relación profesional con el que quieres trabajar." />;
}