import { createFileRoute } from "@tanstack/react-router";
import { RecordTable } from "@/components/record-table";
import {
  PUBLICACION_CANALES, PUBLICACION_ESTADOS, PUBLICACION_TIPOS,
} from "@/lib/comunicacion-model";

export const Route = createFileRoute("/_authenticated/_admin/comunicacion/publicaciones")({
  component: PublicacionesPage,
});

function PublicacionesPage() {
  return (
    <RecordTable
      table="publicaciones"
      kicker="Comunicación"
      title="Publicaciones"
      description="Registro de publicaciones y comunicaciones enviadas al exterior. Se alimenta manualmente y desde las campañas de marketing."
      newLabel="Nueva publicación"
      searchKey="contenido_resumen"
      orderBy="fecha"
      filters={[
        { key: "canal", label: "Canal", options: PUBLICACION_CANALES },
        { key: "estado", label: "Estado", options: PUBLICACION_ESTADOS },
      ]}
      columns={[
        { key: "fecha", label: "Fecha", type: "date" },
        { key: "canal", label: "Canal", options: PUBLICACION_CANALES },
        { key: "tipo", label: "Tipo", options: PUBLICACION_TIPOS },
        { key: "contenido_resumen", label: "Resumen" },
        { key: "estado", label: "Estado", type: "badge", options: PUBLICACION_ESTADOS },
        { key: "alcance", label: "Alcance" },
      ]}
      fields={[
        { key: "fecha", label: "Fecha", type: "date", required: true },
        { key: "estado", label: "Estado", type: "select", options: PUBLICACION_ESTADOS, required: true },
        { key: "canal", label: "Canal", type: "select", options: PUBLICACION_CANALES, required: true },
        { key: "tipo", label: "Tipo", type: "select", options: PUBLICACION_TIPOS, required: true },
        { key: "contenido_resumen", label: "Resumen del contenido", type: "textarea", full: true },
        { key: "representado_vinculado", label: "Representado vinculado", type: "composer" },
        { key: "proyecto_vinculado", label: "Proyecto vinculado", type: "production" },
        { key: "url", label: "URL de la publicación", type: "url" },
        { key: "alcance", label: "Alcance", type: "number" },
      ]}
    />
  );
}
