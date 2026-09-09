import { createFileRoute } from "@tanstack/react-router";
import { OpportunitiesList } from "@/components/opportunities-list";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/producciones")({
  component: OportunidadesProducciones,
  head: () => ({
    meta: [
      { title: "Oportunidades · Producciones | Interesante Compañía" },
      { name: "description", content: "Proyectos detectados: alta manual o por JSON, presupuesto, fase, productora, director y seguimiento IC." },
      { property: "og:title", content: "Oportunidades · Producciones" },
      { property: "og:description", content: "Proyectos detectados y su seguimiento comercial en Interesante Compañía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function OportunidadesProducciones() {
  return (
    <OpportunitiesList
      fixedKinds={["pitch"]}
      listKey="oportunidades-producciones"
      productionMode
      eyebrow="OPORTUNIDADES DE VENTAS · PRODUCCIONES"
      title="OPORTUNIDADES · PRODUCCIONES"
      description="Proyectos detectados en desarrollo o producción. Alta manual o importación por JSON, sin duplicar: si el título y el director ya existen, la ficha se actualiza."
    />
  );
}
