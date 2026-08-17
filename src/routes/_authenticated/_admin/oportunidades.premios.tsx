import { createFileRoute } from "@tanstack/react-router";
import { DeadlineOpportunities } from "@/components/deadline-opportunities";

const ESTADOS = ["Identificado", "Candidatura enviada", "Nominado", "Premio obtenido", "No seleccionado"] as const;

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/premios")({
  component: () => (
    <DeadlineOpportunities
      table="oportunidades_premios"
      title="PREMIOS"
      description="Premios y candidaturas a los que presentar representados y producciones, con sus plazos y galas."
      newLabel="Nuevo premio"
      nameKey="nombre_premio"
      deadlineKey="fecha_limite_inscripcion"
      deadlineLabel="Fecha límite"
      estados={ESTADOS}
      columns={[
        { key: "nombre_premio", label: "Premio" },
        { key: "categoria", label: "Categoría" },
        { key: "edicion", label: "Edición" },
        { key: "fecha_gala_fallo", label: "Gala / fallo", type: "date" },
        { key: "pais", label: "País" },
        { key: "estado", label: "Estado" },
      ]}
      fields={[
        { key: "nombre_premio", label: "Nombre del premio", type: "text", required: true, full: true },
        { key: "categoria", label: "Categoría", type: "text" },
        { key: "edicion", label: "Edición", type: "text" },
        { key: "institucion_id", label: "Institución convocante", type: "institucion" },
        { key: "fecha_apertura_candidaturas", label: "Apertura de candidaturas", type: "date" },
        { key: "fecha_limite_inscripcion", label: "Fecha límite de inscripción", type: "date", required: true },
        { key: "fecha_gala_fallo", label: "Fecha de gala / fallo", type: "date" },
        { key: "pais", label: "País", type: "text" },
        { key: "representado_vinculado", label: "Representado vinculado", type: "composer" },
        { key: "produccion_vinculada", label: "Producción vinculada", type: "production" },
        { key: "estado", label: "Estado", type: "select", options: ESTADOS },
        { key: "url", label: "URL", type: "url" },
        { key: "resultado_notas", label: "Resultado", type: "textarea", full: true },
        { key: "notas", label: "Notas", type: "textarea", full: true },
      ]}
    />
  ),
});