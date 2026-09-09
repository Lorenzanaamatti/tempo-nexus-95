import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { ProductionGantt, type GanttPhase } from "@/components/production-gantt";

export const Route = createFileRoute("/_authenticated/_admin/producciones/gantt-demo")({
  head: () => ({
    meta: [
      { title: "Vista Gantt de producción · Interesante Compañía" },
      { name: "description", content: "Propuesta de calendario estratificado por fases, responsables y estado para producciones en curso." },
      { property: "og:title", content: "Vista Gantt de producción" },
      { property: "og:description", content: "Calendario estratificado por fases, responsables y estado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GanttDemo,
});

const DEMO: GanttPhase[] = [
  { id: "1", name: "Negociación y deal memo", owner: "agencia", start: "2026-08-10", end: "2026-09-05", status: "completada", note: "Firmado 05/09" },
  { id: "2", name: "Contrato y alta AIE", owner: "agencia", start: "2026-09-01", end: "2026-09-20", status: "en_curso", note: "Pendiente firma productora" },
  { id: "3", name: "Facturación 1er sprint (40%)", owner: "agencia", start: "2026-09-21", end: "2026-09-30", status: "planificada" },
  { id: "4", name: "Entrega de cue sheet", owner: "agencia", start: "2026-12-15", end: "2026-12-15", status: "planificada", milestone: true, note: "Hito" },

  { id: "5", name: "Spotting con dirección", owner: "representado", start: "2026-09-08", end: "2026-09-14", status: "en_curso", note: "2 sesiones online" },
  { id: "6", name: "Composición temas principales", owner: "representado", start: "2026-09-15", end: "2026-10-25", status: "planificada", note: "Maquetas cada viernes" },
  { id: "7", name: "Grabación orquesta", owner: "representado", start: "2026-11-02", end: "2026-11-08", status: "planificada", note: "Budapest · 3 días" },
  { id: "8", name: "Mezcla y masterización", owner: "representado", start: "2026-11-09", end: "2026-11-30", status: "planificada" },

  { id: "9", name: "Entrega de montaje bloqueado", owner: "productora", start: "2026-09-05", end: "2026-09-12", status: "bloqueada", note: "Retraso de 1 semana" },
  { id: "10", name: "Validación de maquetas", owner: "productora", start: "2026-10-26", end: "2026-11-01", status: "planificada" },
  { id: "11", name: "Mezcla final de sala", owner: "productora", start: "2026-12-01", end: "2026-12-14", status: "planificada" },
];

function GanttDemo() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Vista Gantt (propuesta)"
        description="Ejemplo con datos ficticios: calendario estratificado por responsable, con estados en color, hitos y anotaciones. Es la vista que verían la agencia y el representado."
      />
      <ProductionGantt phases={DEMO} today={new Date("2026-09-09")} />
      <div className="rounded-sm border border-border p-4 text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Cómo funcionaría</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>La agente rellena a mano cada fase (nombre, responsable, inicio, fin, estado y nota) en la ficha del proyecto y en el contrato.</li>
          <li>Las filas se agrupan por responsable: Agencia, Representado y Productora / Cliente.</li>
          <li>El representado ve el mismo gráfico en su portal, en solo lectura.</li>
          <li>Cada fase con fechas sigue apareciendo en el calendario y puede generar tarea.</li>
        </ul>
      </div>
    </div>
  );
}
