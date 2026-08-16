import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/legal/templates-presupuesto")({
  component: () => (
    <MarketingLibrary
      section="legal-presupuestos"
      allowCustomCategories
      eyebrow="Legal"
      title="Templates presupuesto"
      description="Modelos de presupuesto por categoría. Puedes añadir modelos, títulos y nuevas categorías."
      categories={[
        { key: "roster", label: "Presupuesto roster" },
        { key: "encargo", label: "Presupuesto encargo" },
        { key: "servicios", label: "Presupuesto servicios" },
      ]}
    />
  ),
});
