import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RecordTable } from "@/components/record-table";
import {
  TEMPLATE_TIPOS, TEMPLATE_IDIOMAS, AGENTE_OPTIONS,
} from "@/lib/comunicacion-model";

export const Route = createFileRoute("/_authenticated/_admin/templates/")({
  component: TemplatesIndex,
});

function TemplatesIndex() {
  const navigate = useNavigate();
  return (
    <RecordTable
      table="templates"
      kicker="Templates documentos"
      title="Plantillas de documentos y emails"
      description="Biblioteca de plantillas reutilizables por el equipo y por los agentes IA. Usa variables con el formato {{nombre_cliente}}."
      newLabel="Nueva plantilla"
      searchKey="nombre"
      orderBy="nombre"
      ascending
      onRowClick={(r) => navigate({ to: "/templates/$templateId", params: { templateId: r.id } })}
      filters={[
        { key: "tipo", label: "Tipo", options: TEMPLATE_TIPOS },
        { key: "idioma", label: "Idioma", options: TEMPLATE_IDIOMAS },
      ]}
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "tipo", label: "Tipo", options: TEMPLATE_TIPOS },
        { key: "idioma", label: "Idioma", options: TEMPLATE_IDIOMAS },
        { key: "uso_agentes", label: "Uso agentes", type: "boolean" },
        { key: "agente_autorizado", label: "Agentes", type: "tags" },
        { key: "activo", label: "Activa", type: "boolean" },
      ]}
      fields={[
        { key: "nombre", label: "Nombre", type: "text", required: true, full: true },
        { key: "tipo", label: "Tipo", type: "select", options: TEMPLATE_TIPOS, required: true },
        { key: "idioma", label: "Idioma", type: "select", options: TEMPLATE_IDIOMAS, required: true },
        { key: "descripcion", label: "Descripción", type: "textarea", full: true },
        { key: "contenido", label: "Contenido (usa {{variables}})", type: "richtext", full: true },
        { key: "uso_agentes", label: "Autorizada para agentes IA", type: "boolean" },
        { key: "activo", label: "Activa", type: "boolean" },
        {
          key: "agente_autorizado", label: "Agentes autorizados", type: "multiselect",
          options: AGENTE_OPTIONS, full: true, visible: (f) => !!f.uso_agentes,
        },
      ]}
    />
  );
}
