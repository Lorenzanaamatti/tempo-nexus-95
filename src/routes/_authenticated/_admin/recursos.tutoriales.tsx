import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/recursos/tutoriales")({
  component: Tutoriales,
  head: () => ({
    meta: [
      { title: "Tutoriales · IC APP" },
      { name: "description", content: "Tutoriales internos de la herramienta de Interesante Compañía." },
      { property: "og:title", content: "Tutoriales · IC APP" },
      { property: "og:description", content: "Tutoriales internos de la herramienta de Interesante Compañía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Tutoriales() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h1 className="font-display text-4xl uppercase text-[color:var(--rust)]">Tutoriales</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Espacio en preparación para los vídeos y guías de uso de la herramienta.
      </p>
    </div>
  );
}
