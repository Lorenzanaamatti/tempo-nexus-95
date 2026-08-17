import { createFileRoute } from "@tanstack/react-router";
import { DeadlineOpportunities } from "@/components/deadline-opportunities";

const TIERS = ["A", "Internacional", "Nacional", "Regional"] as const;
const TIPOS = ["Competición", "Mercado", "Música", "Documental", "Cortometraje", "Animación", "Otro"] as const;
const ESTADOS = ["Identificado", "En preparación", "Inscrito", "Seleccionado", "No seleccionado", "Premio obtenido"] as const;

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/festivales")({
  component: () => (
    <DeadlineOpportunities
      table="oportunidades_festivales"
      title="FESTIVALES"
      description="Festivales y mercados donde inscribir producciones y representados, con sus deadlines de inscripción."
      newLabel="Nuevo festival"
      nameKey="nombre_festival"
      deadlineKey="fecha_deadline_inscripcion"
      deadlineLabel="Deadline inscripción"
      estados={ESTADOS}
      columns={[
        { key: "nombre_festival", label: "Festival" },
        { key: "edicion", label: "Edición" },
        { key: "tier", label: "Tier" },
        { key: "tipo", label: "Tipo" },
        { key: "pais", label: "País" },
        { key: "estado", label: "Estado" },
      ]}
      fields={[
        { key: "nombre_festival", label: "Nombre del festival", type: "text", required: true, full: true },
        { key: "edicion", label: "Edición", type: "text" },
        { key: "institucion_id", label: "Institución organizadora", type: "institucion" },
        { key: "tier", label: "Tier", type: "select", options: TIERS },
        { key: "tipo", label: "Tipo", type: "select", options: TIPOS },
        { key: "fecha_inicio", label: "Fecha de inicio", type: "date" },
        { key: "fecha_fin", label: "Fecha de fin", type: "date" },
        { key: "fecha_deadline_inscripcion", label: "Deadline de inscripción", type: "date", required: true },
        { key: "pais", label: "País", type: "text" },
        { key: "ciudad", label: "Ciudad", type: "text" },
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