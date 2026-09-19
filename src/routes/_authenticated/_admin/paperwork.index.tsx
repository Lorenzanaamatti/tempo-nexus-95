import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/paperwork/")({
  component: PaperworkLanding,
  head: () => ({ meta: [
    { title: "Paperwork | Interesante Compañía" },
    { name: "description", content: "Accesos a presupuestos, acuerdos, contratos y documentación administrativa." },
    { property: "og:title", content: "Paperwork | Interesante Compañía" },
    { property: "og:description", content: "Documentación de proyectos de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function PaperworkLanding() {
  return <GroupLanding groupLabel="Paperwork" description="Elige el tipo de documento o acuerdo con el que quieres trabajar." />;
}