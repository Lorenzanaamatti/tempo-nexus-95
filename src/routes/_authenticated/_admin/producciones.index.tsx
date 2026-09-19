import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/producciones/")({
  component: ProduccionesLanding,
  head: () => ({ meta: [
    { title: "Producciones | Interesante Compañía" },
    { name: "description", content: "Accesos a producciones activas, seguimiento, planificación y archivo." },
    { property: "og:title", content: "Producciones | Interesante Compañía" },
    { property: "og:description", content: "Gestión de producciones de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function ProduccionesLanding() {
  return <GroupLanding groupLabel="Producciones" description="Elige la vista de producción que necesitas consultar o actualizar." />;
}