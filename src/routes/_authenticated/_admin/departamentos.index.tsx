import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/departamentos/")({
  component: DepartamentosLanding,
  head: () => ({ meta: [
    { title: "Departamentos | Interesante Compañía" },
    { name: "description", content: "Accesos a las áreas operativas de Interesante Compañía." },
    { property: "og:title", content: "Departamentos | Interesante Compañía" },
    { property: "og:description", content: "Departamentos de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function DepartamentosLanding() {
  return <GroupLanding groupLabel="Departamentos" description="Elige el departamento desde el que quieres continuar." />;
}