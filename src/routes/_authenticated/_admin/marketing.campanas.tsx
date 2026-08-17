import { createFileRoute } from "@tanstack/react-router";
import { RecordTable } from "@/components/record-table";
import { CAMPANA_ESTADOS, CAMPANA_TIPOS, CANALES_MARKETING } from "@/lib/comunicacion-model";

export const Route = createFileRoute("/_authenticated/_admin/marketing/campanas")({
  component: CampanasPage,
});

function CampanasPage() {
  return (
    <RecordTable
      table="campanas"
      kicker="Marketing"
      title="Campañas"
      description="Seguimiento de campañas de marketing de IC y de cada representado, con presupuesto, canales y resultados."
      newLabel="Nueva campaña"
      searchKey="nombre"
      orderBy="fecha_inicio"
      filters={[
        { key: "tipo", label: "Tipo", options: CAMPANA_TIPOS },
        { key: "estado", label: "Estado", options: CAMPANA_ESTADOS },
      ]}
      columns={[
        { key: "nombre", label: "Campaña" },
        { key: "tipo", label: "Tipo", options: CAMPANA_TIPOS },
        { key: "fecha_inicio", label: "Inicio", type: "date" },
        { key: "fecha_fin", label: "Fin", type: "date" },
        { key: "presupuesto", label: "Presupuesto", type: "money" },
        { key: "inversion_real", label: "Inversión real", type: "money" },
        { key: "canales", label: "Canales", type: "tags", options: CANALES_MARKETING },
        { key: "estado", label: "Estado", type: "badge", options: CAMPANA_ESTADOS },
      ]}
      fields={[
        { key: "nombre", label: "Nombre", type: "text", required: true, full: true },
        { key: "tipo", label: "Tipo", type: "select", options: CAMPANA_TIPOS, required: true },
        { key: "estado", label: "Estado", type: "select", options: CAMPANA_ESTADOS, required: true },
        { key: "representado_vinculado", label: "Representado vinculado", type: "composer" },
        { key: "presupuesto", label: "Presupuesto (€)", type: "money" },
        { key: "fecha_inicio", label: "Fecha de inicio", type: "date" },
        { key: "fecha_fin", label: "Fecha de fin", type: "date" },
        { key: "inversion_real", label: "Inversión real (€)", type: "money" },
        { key: "canales", label: "Canales", type: "multiselect", options: CANALES_MARKETING, full: true },
        { key: "objetivo", label: "Objetivo", type: "textarea", full: true },
        { key: "resultados_resumen", label: "Resultados", type: "textarea", full: true },
      ]}
    />
  );
}
