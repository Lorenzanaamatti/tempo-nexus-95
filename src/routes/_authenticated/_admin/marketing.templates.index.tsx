import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/marketing/templates/")({
  component: TemplatesIndex,
});

function TemplatesIndex() {
  return (
    <MarketingLibrary
      section="templates"
      eyebrow="Marketing"
      title="Templates"
      description="Modelos escritos: comunicación de ventas, blog, casos de éxito y cualquier artículo sobre Interesante Compañía."
      categories={[
        { key: "ventas", label: "Comunicación de ventas" },
        { key: "blog", label: "Blog" },
        { key: "casos-exito", label: "Casos de éxito" },
        { key: "articulos", label: "Artículos IC" },
      ]}
    />
  );
}
