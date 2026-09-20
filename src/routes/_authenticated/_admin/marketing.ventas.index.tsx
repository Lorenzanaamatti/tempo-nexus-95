import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/marketing/ventas/")({
  head: () => ({ meta: [
    { title: "Documentos de venta | IC APP" },
    { name: "description", content: "Acceso a la biblioteca y compositor de documentos de venta." },
    { property: "og:title", content: "Documentos de venta | IC APP" },
    { property: "og:description", content: "Acceso a la biblioteca y compositor de documentos de venta." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: VentasIndex,
});

function VentasIndex() {
  return <Navigate to="/comunicacion/documentos-venta" replace />;
}
