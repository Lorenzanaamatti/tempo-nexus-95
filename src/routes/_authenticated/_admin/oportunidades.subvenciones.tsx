import { createFileRoute } from "@tanstack/react-router";
import { DeadlineOpportunities } from "@/components/deadline-opportunities";

const AMBITOS = ["Local", "Autonómico", "Nacional", "Europeo", "Internacional"] as const;
const TIPOS = ["Producción musical", "Internacionalización", "Formación", "Investigación", "Otro"] as const;
const ESTADOS = ["Sin valorar", "En preparación", "Solicitada", "Concedida", "Denegada"] as const;

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/subvenciones")({
  component: () => (
    <DeadlineOpportunities
      table="oportunidades_subvenciones"
      title="SUBVENCIONES"
      description="Convocatorias públicas y privadas a las que puede optar Interesante Compañía o sus representados."
      newLabel="Nueva subvención"
      nameKey="nombre_convocatoria"
      deadlineKey="fecha_limite_solicitud"
      deadlineLabel="Fecha límite"
      estados={ESTADOS}
      columns={[
        { key: "nombre_convocatoria", label: "Convocatoria" },
        { key: "institucion_nombre", label: "Institución" },
        { key: "ambito", label: "Ámbito" },
        { key: "tipo", label: "Tipo" },
        { key: "importe_maximo", label: "Importe máx.", type: "money" },
        { key: "estado", label: "Estado" },
      ]}
      fields={[
        { key: "nombre_convocatoria", label: "Nombre de la convocatoria", type: "text", required: true, full: true },
        { key: "institucion_id", label: "Institución (partner)", type: "institucion" },
        { key: "institucion_nombre", label: "Institución (texto libre)", type: "text" },
        { key: "ambito", label: "Ámbito", type: "select", options: AMBITOS },
        { key: "tipo", label: "Tipo", type: "select", options: TIPOS },
        { key: "importe_maximo", label: "Importe máximo (€)", type: "number" },
        { key: "fecha_apertura", label: "Fecha de apertura", type: "date" },
        { key: "fecha_limite_solicitud", label: "Fecha límite de solicitud", type: "date", required: true },
        { key: "fecha_resolucion", label: "Fecha de resolución", type: "date" },
        { key: "estado", label: "Estado", type: "select", options: ESTADOS },
        { key: "importe_solicitado", label: "Importe solicitado (€)", type: "number" },
        { key: "importe_concedido", label: "Importe concedido (€)", type: "number" },
        { key: "representado_vinculado", label: "Representado vinculado", type: "composer" },
        { key: "url_convocatoria", label: "URL de la convocatoria", type: "url" },
        { key: "requisitos", label: "Requisitos", type: "textarea", full: true },
        { key: "notas", label: "Notas", type: "textarea", full: true },
      ]}
    />
  ),
});