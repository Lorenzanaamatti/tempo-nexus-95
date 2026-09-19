import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/recursos/")({
  component: RecursosLanding,
  head: () => ({ meta: [
    { title: "Recursos | Interesante Compañía" },
    { name: "description", content: "Documentos, agenda, aprendizaje y herramientas internas." },
    { property: "og:title", content: "Recursos | Interesante Compañía" },
    { property: "og:description", content: "Recursos internos de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function RecursosLanding() {
  return <GroupLanding groupLabel="Recursos" description="Elige la biblioteca, agenda o herramienta interna que necesitas." />;
}