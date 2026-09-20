import { createFileRoute } from "@tanstack/react-router";
import { SubvencionesPanel } from "@/components/ic/subvenciones/subvenciones-panel";

export const Route = createFileRoute("/_authenticated/_admin/departamentos/subvenciones")({
  component: DepartamentosSubvencionesPage,
  head: () => ({
    meta: [
      { title: "Subvenciones | Interesante Compañía" },
      { name: "description", content: "Vigilancia diaria de convocatorias, bandeja de revisión y expedientes de subvenciones." },
      { property: "og:title", content: "Subvenciones | Interesante Compañía" },
      { property: "og:description", content: "Vigilancia diaria de convocatorias, bandeja de revisión y expedientes de subvenciones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DepartamentosSubvencionesPage() {
  return (
    <div className="mx-auto w-full max-w-[1700px] px-6 py-10">
      <header className="border-b border-border pb-6">
        <p className="smallcaps text-rust">Departamentos</p>
        <h1 className="mt-1 font-display text-5xl font-extrabold">SUBVENCIONES</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Las fuentes se revisan a diario; la bandeja ordena lo detectado por encaje con Interesante.
        </p>
      </header>
      <div className="mt-8">
        <SubvencionesPanel />
      </div>
    </div>
  );
}
