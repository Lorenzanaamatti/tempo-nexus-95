import { createFileRoute } from "@tanstack/react-router";
import { SectionDoors, type Door } from "@/components/section-doors";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/")({
  component: OportunidadesIndex,
  head: () => ({
    meta: [
      { title: "Oportunidades de ventas | Interesante Compañía" },
      { name: "description", content: "Todo lo que puede convertirse en trabajo: producciones en desarrollo, productoras a contactar y pitches en curso." },
      { property: "og:title", content: "Oportunidades de ventas" },
      { property: "og:description", content: "Todo lo que puede convertirse en trabajo en Interesante Compañía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const DOORS: Door[] = [
  {
    title: "Producciones en desarrollo",
    description: "Proyectos detectados en España y Europa, listos para pitch.",
    to: "/oportunidades/producciones",
  },
  {
    title: "Productoras a contactar",
    description: "Productoras, plataformas y partners estratégicos a los que presentar IC.",
    to: "/oportunidades/partners",
  },
  {
    title: "Pitches en curso",
    description: "Propuestas activas de roster IC y su seguimiento.",
    to: "/oportunidades/pitches",
  },
];

function OportunidadesIndex() {
  return (
    <div className="mx-auto max-w-[1700px] px-6 py-14">
      <div className="mb-10 text-center">
        <p className="smallcaps text-muted-foreground">Sección</p>
        <h1 className="mt-1 font-display text-5xl title-caps">OPORTUNIDADES DE VENTAS</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Todo lo que puede convertirse en trabajo. Elige por dónde entrar.
        </p>
      </div>
      <SectionDoors doors={DOORS} columns={2} />
    </div>
  );
}
