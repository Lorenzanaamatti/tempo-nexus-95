import { createFileRoute } from "@tanstack/react-router";
import { SectionDoors, type Door } from "@/components/section-doors";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/fichajes")({
  component: OportunidadesFichajes,
  head: () => ({
    meta: [
      { title: "Fichajes que queremos | Interesante Compañía" },
      { name: "description", content: "Talento detectado en producciones españolas y embudo de incorporación al roster." },
      { property: "og:title", content: "Fichajes que queremos" },
      { property: "og:description", content: "Talento detectado y embudo de incorporación al roster IC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const DOORS: Door[] = [
  {
    title: "Composers ESP",
    description: "Radar de profesionales musicales detectados en producciones españolas.",
    to: "/oportunidades/roster",
  },
  {
    title: "Quiero fichar a",
    description: "Embudo de incorporación: candidatos, prospección y roster objetivo.",
    to: "/oportunidades/prospects-fichaje",
  },
];

function OportunidadesFichajes() {
  return (
    <div className="mx-auto max-w-[1700px] px-6 py-14">
      <div className="mb-10 text-center">
        <p className="smallcaps text-muted-foreground">Clientes</p>
        <h1 className="mt-1 font-display text-5xl title-caps">FICHAJES QUE QUEREMOS</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Todo el talento que queremos incorporar al roster, en dos vistas.
        </p>
      </div>
      <SectionDoors doors={DOORS} columns={2} />
    </div>
  );
}
