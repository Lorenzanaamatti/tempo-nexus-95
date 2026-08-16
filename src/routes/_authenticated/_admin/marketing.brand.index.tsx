import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/marketing/brand/")({
  component: BrandIndex,
});

function BrandIndex() {
  return (
    <MarketingLibrary
      section="identidad"
      eyebrow="Marketing"
      title="Identidad corporativa"
      description="Todo lo que define y presenta a Interesante Compañía: logotipos, modelos de documentos, decks, one pagers y clipping de la marca."
      categories={[
        { key: "logotipos", label: "Logotipos" },
        { key: "documentos", label: "Modelos de documentos" },
        { key: "decks", label: "Decks" },
        { key: "one-pagers", label: "One pagers IC" },
        { key: "clipping", label: "Clipping IC" },
      ]}
    />
  );
}
