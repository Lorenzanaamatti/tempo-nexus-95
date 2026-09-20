import { createFileRoute } from "@tanstack/react-router";
import { MarketingLibrary } from "@/components/marketing-library";

export const Route = createFileRoute("/_authenticated/_admin/comunicacion/blog")({
  component: BlogPage,
  head: () => ({ meta: [{ title: "Blog y publicaciones | Interesante Compañía" }, { name: "description", content: "Biblioteca de artículos, borradores y publicaciones de Interesante Compañía." }, { property: "og:title", content: "Blog y publicaciones | Interesante Compañía" }, { property: "og:description", content: "Biblioteca de artículos, borradores y publicaciones." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function BlogPage() { return <MarketingLibrary section="comunicacion-blog" eyebrow="Comunicación" title="Blog y publicaciones" description="Artículos, borradores, publicaciones y materiales asociados." allowCustomCategories categories={[{key:"borradores",label:"Borradores"},{key:"publicados",label:"Publicados"},{key:"ideas",label:"Ideas"}]}/>; }
