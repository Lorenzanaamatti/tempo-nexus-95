import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/legal/templates-deal-memo")({
  component: () => (
    <MarketingLibrary
      section="legal-deal-memos"
      allowCustomCategories
      eyebrow="Legal"
      title="Templates deal memo"
      description="Modelos de deal memo por categoría. Puedes añadir modelos, títulos y nuevas categorías."
      categories={[
        { key: "roster", label: "Deal memo roster" },
        { key: "encargo", label: "Deal memo encargo" },
        { key: "otros", label: "Deal memo otros" },
      ]}
    />
  ),
});
