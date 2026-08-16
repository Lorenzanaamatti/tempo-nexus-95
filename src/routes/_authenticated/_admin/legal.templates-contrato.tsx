import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/legal/templates-contrato")({
  component: () => (
    <MarketingLibrary
      section="legal-contratos"
      allowCustomCategories
      eyebrow="Legal"
      title="Templates contrato"
      description="Modelos de contrato por categoría. Puedes añadir tus propios modelos, títulos y categorías."
      categories={[
        { key: "roster", label: "Contrato roster" },
        { key: "encargo", label: "Contrato encargo" },
        { key: "editorial", label: "Contrato editorial" },
        { key: "servicios", label: "Contrato servicios" },
        { key: "otros", label: "Otros contratos" },
      ]}
    />
  ),
});
