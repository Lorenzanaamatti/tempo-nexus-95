import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecordTable } from "@/components/record-table";
import { OBLIGACION_ESTADOS } from "@/lib/comunicacion-model";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/marketing/obligaciones")({
  component: ObligacionesMarketingPage,
  head: () => ({
    meta: [
      { title: "Obligaciones de marketing | Interesante Compañía" },
      { name: "description", content: "Alta y seguimiento de compromisos de marketing vinculados a producciones, contratos y roster." },
      { property: "og:title", content: "Obligaciones de marketing" },
      { property: "og:description", content: "Compromisos de marketing de Interesante Compañía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ObligacionesMarketingPage() {
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
      kicker="Marketing"
      title="Obligaciones de marketing"
      description="Compromisos de marketing vinculados a contratos, producciones o representados. Cada fecha límite genera su aviso de calendario."
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
          key: "contrato_vinculado",
          label: "Contrato vinculado",
          type: "select",
          options: (contratosQ.data ?? []).map((contract) => ({ value: contract.id, label: contract.title ?? "Contrato" })),
        },
        { key: "notas", label: "Notas", type: "textarea", full: true },
      ]}
    />
  );
}
