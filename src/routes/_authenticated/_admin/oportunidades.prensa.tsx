import { createFileRoute } from "@tanstack/react-router";
import { DeadlineOpportunities } from "@/components/deadline-opportunities";

const INICIATIVAS = [
  "Reactiva",
  "Proactiva",
  "Autocandidatura",
] as const;

const TIPOS = ["Entrevista", "Reportaje", "Reseña", "Nota de prensa", "Podcast", "TV / Radio", "Otro"] as const;
const AMBITOS = ["Local", "Nacional", "Internacional"] as const;
const ESTADOS = ["Identificada", "En preparación", "Enviada", "Confirmada", "Publicada", "Descartada"] as const;

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/prensa")({
  component: () => (
    <DeadlineOpportunities
      table="oportunidades_prensa"
      title="PRENSA"
      description="Oportunidades de prensa y medios: quién contacta a quién, envíos de materiales y deadlines de publicación."
      newLabel="Nueva oportunidad de prensa"
      nameKey="nombre"
      deadlineKey="fecha_deadline"
      deadlineLabel="Deadline"
      estados={ESTADOS}
      columns={[
        { key: "nombre", label: "Oportunidad" },
        { key: "iniciativa", label: "Iniciativa" },
        { key: "tipo", label: "Tipo" },
        { key: "ambito", label: "Ámbito" },
        { key: "estado", label: "Estado" },
        { key: "fecha_publicacion_prevista", label: "Publicación prevista", type: "date" },
      ]}
      fields={[
        { key: "nombre", label: "Nombre de la oportunidad", type: "text", required: true, full: true },
        {
          key: "iniciativa",
          label: "Iniciativa",
          type: "select",
          options: INICIATIVAS,
          required: true,
        },
        {
          key: "medio_vinculado",
          label: "Medio vinculado",
          type: "institucion",
          requiredIf: (f) => f.iniciativa !== "Autocandidatura",
        },
        {
          key: "medios_destinatarios",
          label: "Medios destinatarios",
          type: "textarea",
          full: true,
          showIf: (f) => f.iniciativa === "Autocandidatura",
        },
        { key: "tipo", label: "Tipo", type: "select", options: TIPOS },
        { key: "ambito", label: "Ámbito", type: "select", options: AMBITOS },
        { key: "representado_vinculado", label: "Representado vinculado", type: "composer" },
        { key: "produccion_vinculada", label: "Producción vinculada", type: "production" },
        { key: "fecha_deadline", label: "Deadline", type: "date" },
        { key: "fecha_publicacion_prevista", label: "Publicación prevista", type: "date" },
        { key: "estado", label: "Estado", type: "select", options: ESTADOS },
        { key: "url", label: "URL", type: "url" },
        { key: "resultado_notas", label: "Resultado", type: "textarea", full: true },
        { key: "notas", label: "Notas", type: "textarea", full: true },
      ]}
    />
  ),
});
