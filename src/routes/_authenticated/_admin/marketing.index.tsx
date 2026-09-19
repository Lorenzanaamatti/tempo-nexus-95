import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/marketing/")({
  component: MarketingLanding,
  head: () => ({ meta: [
    { title: "Marketing | Interesante Compañía" },
    { name: "description", content: "Accesos a campañas, métricas y obligaciones de marketing." },
    { property: "og:title", content: "Marketing | Interesante Compañía" },
    { property: "og:description", content: "Marketing de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function MarketingLanding() {
  return <GroupLanding groupLabel="Marketing" description="Elige entre planificación, resultados y obligaciones de marketing." />;
}