import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/comunicacion/epk")({
  component: EpkPage,
  head: () => ({ meta: [{ title: "EPK | Interesante Compañía" }, { name: "description", content: "Electronic Press Kits del roster y de Interesante Compañía." }, { property: "og:title", content: "EPK | Interesante Compañía" }, { property: "og:description", content: "Electronic Press Kits del roster y de la compañía." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function EpkPage() { return <MarketingLibrary section="comunicacion-epk" eyebrow="Comunicación" title="EPK" description="Electronic Press Kits del roster y de Interesante Compañía." allowCustomCategories categories={[{key:"roster",label:"Roster"},{key:"ic",label:"Interesante Compañía"},{key:"proyectos",label:"Proyectos"}]}/>; }
