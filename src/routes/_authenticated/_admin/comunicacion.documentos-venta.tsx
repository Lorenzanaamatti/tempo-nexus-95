import { createFileRoute } from "@tanstack/react-router";
import { SalesDocumentStudio } from "@/components/sales-document-studio";

export const Route = createFileRoute("/_authenticated/_admin/comunicacion/documentos-venta")({
  head: () => ({ meta: [
    { title: "Documentos de venta | IC APP" },
    { name: "description", content: "Biblioteca y compositor de documentos de venta de Interesante Compañía." },
    { property: "og:title", content: "Documentos de venta | IC APP" },
    { property: "og:description", content: "Biblioteca y compositor de documentos de venta de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SalesDocumentStudio,
});
