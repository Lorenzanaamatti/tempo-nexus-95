import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/comunicacion/reels")({
  component: ReelsPage,
  head: () => ({ meta: [{ title: "Reels | Interesante Compañía" }, { name: "description", content: "Reels y piezas audiovisuales de presentación." }, { property: "og:title", content: "Reels | Interesante Compañía" }, { property: "og:description", content: "Reels y piezas audiovisuales de presentación." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function ReelsPage() { return <MarketingLibrary section="comunicacion-reels" eyebrow="Comunicación" title="Reels" description="Reels y piezas audiovisuales de presentación." allowCustomCategories categories={[{key:"compositores",label:"Compositores"},{key:"artistas",label:"Artistas"},{key:"proyectos",label:"Proyectos"},{key:"ic",label:"Interesante Compañía"}]}/>; }
