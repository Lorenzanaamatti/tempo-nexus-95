import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/marketing/ventas/")({
  component: VentasIndex,
});

function VentasIndex() {
  return (
    <MarketingLibrary
      section="ventas"
      eyebrow="Marketing"
      title="Ventas"
      description="Materiales de venta del roster: reels, one pagers, dossiers, CV, clipping y EPK listos para enviar a productoras y plataformas."
      categories={[
        { key: "reels", label: "Reels" },
        { key: "one-pagers", label: "One pagers" },
        { key: "dossiers", label: "Dossiers" },
        { key: "cv", label: "CV" },
        { key: "clipping-roster", label: "Clipping roster" },
        { key: "epk", label: "EPK" },
      ]}
    />
  );
}
