import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/comunicacion/")({
  component: ComunicacionLanding,
  head: () => ({ meta: [
    { title: "Comunicación | Interesante Compañía" },
    { name: "description", content: "Accesos a identidad, contenidos, prensa, festivales y materiales de venta." },
    { property: "og:title", content: "Comunicación | Interesante Compañía" },
    { property: "og:description", content: "Comunicación y contenidos de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function ComunicacionLanding() {
  return <GroupLanding groupLabel="Comunicación" description="Elige el área de comunicación, contenido o difusión en la que quieres trabajar." />;
}