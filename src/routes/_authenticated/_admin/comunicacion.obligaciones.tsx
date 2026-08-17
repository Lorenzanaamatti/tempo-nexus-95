import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecordTable } from "@/components/record-table";
import { OBLIGACION_ESTADOS } from "@/lib/comunicacion-model";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/comunicacion/obligaciones")({
  component: ObligacionesPage,
});

function ObligacionesPage() {
  const contratosQ = useQuery({
    queryKey: ["lookup-contracts"],
    queryFn: async () => {
      const { data, error } = await db.from("contracts").select("id, title").order("title");
      if (error) throw error;
      return (data ?? []) as { id: string; title: string | null }[];
    },
  });

  return (
    <RecordTable
      table="obligaciones_comunicacion"
      kicker="Comunicación"
      title="Obligaciones"
      description="Compromisos de comunicación contractuales o estratégicos. Cada fecha límite genera evento de calendario y preaviso de AITANA 15 días antes."
      newLabel="Nueva obligación"
      searchKey="descripcion"
      orderBy="fecha_limite"
      ascending
      filters={[{ key: "estado", label: "Estado", options: OBLIGACION_ESTADOS }]}
      columns={[
        { key: "descripcion", label: "Descripción" },
        { key: "fecha_limite", label: "Fecha límite", type: "date" },
        { key: "estado", label: "Estado", type: "badge", options: OBLIGACION_ESTADOS },
        { key: "notas", label: "Notas" },
      ]}
      fields={[
        { key: "descripcion", label: "Descripción", type: "text", required: true, full: true },
        { key: "fecha_limite", label: "Fecha límite", type: "date", required: true },
        { key: "estado", label: "Estado", type: "select", options: OBLIGACION_ESTADOS, required: true },
        { key: "representado_vinculado", label: "Representado vinculado", type: "composer" },
        { key: "produccion_vinculada", label: "Producción vinculada", type: "production" },
        {
          key: "contrato_vinculado", label: "Contrato vinculado", type: "select",
          options: (contratosQ.data ?? []).map((c) => ({ value: c.id, label: c.title ?? "Contrato" })),
        },
        { key: "notas", label: "Notas", type: "textarea", full: true },
      ]}
    />
  );
}
