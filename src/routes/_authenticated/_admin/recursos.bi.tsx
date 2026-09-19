import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/recursos/bi")({
  component: Bi,
  head: () => ({
    meta: [
      { title: "BI · IC APP" },
      { name: "description", content: "Cuadros de inteligencia de negocio de Interesante Compañía." },
      { property: "og:title", content: "BI · IC APP" },
      { property: "og:description", content: "Cuadros de inteligencia de negocio de Interesante Compañía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Bi() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h1 className="font-display text-4xl uppercase text-[color:var(--rust)]">BI</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Espacio en preparación para los cuadros de inteligencia de negocio.
      </p>
    </div>
  );
}
