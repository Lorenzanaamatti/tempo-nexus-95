import { createFileRoute } from "@tanstack/react-router";
import { GroupLanding } from "@/components/section-landing";

export const Route = createFileRoute("/_authenticated/_admin/clientes/")({
  component: ClientesLanding,
  head: () => ({ meta: [
    { title: "Clientes | Interesante Compañía" },
    { name: "description", content: "Acceso al roster completo y a todas las especialidades representadas." },
    { property: "og:title", content: "Clientes | Interesante Compañía" },
    { property: "og:description", content: "Roster y especialidades de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function ClientesLanding() {
  return <GroupLanding groupLabel="Clientes" description="Elige una vista del roster o entra directamente en una especialidad." />;
}