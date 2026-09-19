import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/empresa/")({
  component: EmpresaLanding,
  head: () => ({ meta: [
    { title: "Empresa | Interesante Compañía" },
    { name: "description", content: "Accesos de dirección, equipo y actividad corporativa de Interesante Compañía." },
    { property: "og:title", content: "Empresa | Interesante Compañía" },
    { property: "og:description", content: "Dirección y actividad corporativa de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function EmpresaLanding() {
  return <GroupLanding groupLabel="Empresa" description="Elige el área de dirección o gestión interna en la que quieres trabajar." />;
}