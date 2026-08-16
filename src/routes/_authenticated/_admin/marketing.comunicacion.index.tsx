import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/marketing/comunicacion/")({
  component: ComunicacionIndex,
});

function ComunicacionIndex() {
  return (
    <MarketingLibrary
      section="comunicacion"
      eyebrow="Marketing"
      title="Comunicación"
      description="Web y redes sociales: una pestaña por canal con sus contenidos y sus plantillas de publicación."
      categories={[
        { key: "web", label: "Web" },
        { key: "web-plantillas", label: "Web · plantillas" },
        { key: "instagram", label: "Instagram" },
        { key: "instagram-plantillas", label: "Instagram · plantillas" },
        { key: "linkedin", label: "LinkedIn" },
        { key: "linkedin-plantillas", label: "LinkedIn · plantillas" },
        { key: "youtube", label: "YouTube" },
        { key: "youtube-plantillas", label: "YouTube · plantillas" },
        { key: "tiktok", label: "TikTok" },
        { key: "tiktok-plantillas", label: "TikTok · plantillas" },
        { key: "newsletter", label: "Newsletter" },
        { key: "newsletter-plantillas", label: "Newsletter · plantillas" },
      ]}
    />
  );
}
