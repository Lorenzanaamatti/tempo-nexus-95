import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/clientes/")({
  component: ClientesLanding,
  head: () => ({ meta: [
    { title: "Clientes | Interesante Compañía" },
    { name: "description", content: "Acceso al roster, sus especialidades y los fichajes que queremos incorporar." },
    { property: "og:title", content: "Clientes | Interesante Compañía" },
    { property: "og:description", content: "Roster, especialidades y fichajes de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function ClientesLanding() {
  return <GroupLanding groupLabel="Clientes" description="Elige una vista del roster, entra en una especialidad o consulta los fichajes que queremos incorporar." />;
}