// Herramientas que los agentes virtuales (AIDA, AINARA, AITANA, AITOR…) pueden usar
// dentro del chat. Las "read" se ejecutan al vuelo; las "write" se guardan como
// propuestas en `agent_actions` y requieren aprobación humana.
//
// Nombre, etiqueta, descripción, tipo y área viven en el catálogo único
// (`src/lib/tool-catalog.ts`). Aquí solo se añade el JSON Schema de entrada.

import {
  toolsForSurface,
  TOOL_CATALOG_BY_NAME,
  type ToolArea,
  type ToolKind,
} from "@/lib/tool-catalog";

export type AgentToolKind = ToolKind;

export type AgentToolDef = {
  name: string;
  label: string;
  description: string;
  kind: AgentToolKind;
  /** JSON Schema para Anthropic tools.input_schema. */
  inputSchema: Record<string, unknown>;
  /** Etiqueta corta del área para agrupar en la UI. */
  area: ToolArea;
};

const INPUT_SCHEMAS: Record<string, Record<string, unknown>> = {
  find_composer: {
    type: "object",
    properties: { query: { type: "string", description: "Nombre o parte del nombre a buscar." } },
    required: ["query"],
  },
  list_recent_deal_memos: {
    type: "object",
    properties: {
      limit: { type: "integer", minimum: 1, maximum: 25, description: "Cantidad a devolver (máx 25)." },
      estado: { type: "string", description: "Filtrar por estado (ej: borrador, enviado, firmado)." },
    },
  },
  find_production: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
  },
  propose_deal_memo: {
    type: "object",
    properties: {
      referencia: { type: "string", description: "Referencia única, ej: DM-2026-042." },
      obra: { type: "string", description: "Obra / proyecto." },
      descripcion_uso: { type: "string", description: "Descripción del uso solicitado." },
      importe_propuesto: { type: "number", description: "Importe propuesto en EUR." },
      destinatario_final_email: { type: "string", description: "Email del destinatario final." },
      plazo_respuesta_dias: { type: "integer", minimum: 1, maximum: 60, description: "Plazo en días para responder." },
      notas_internas: { type: "string", description: "Notas internas opcionales." },
    },
    required: ["referencia", "obra", "descripcion_uso", "destinatario_final_email"],
  },
  propose_calendar_event: {
    type: "object",
    properties: {
      title: { type: "string" },
      start_date: { type: "string", description: "YYYY-MM-DD" },
      end_date: { type: "string", description: "YYYY-MM-DD" },
      calendar_category: {
        type: "string",
        enum: ["operativo", "marketing", "legal", "facturacion", "personal"],
      },
      kind: { type: "string", description: "Tipo de evento, ej: 'tarea', 'reunion'." },
      note: { type: "string" },
    },
    required: ["title", "start_date", "end_date"],
  },
  propose_action_task: {
    type: "object",
    properties: {
      subject_type: { type: "string", enum: ["composer", "production", "opportunity"] },
      subject_id: { type: "string", description: "UUID del sujeto (compositor/producción/oportunidad)." },
      title: { type: "string" },
      notes: { type: "string" },
      due_date: { type: "string", description: "YYYY-MM-DD" },
    },
    required: ["subject_type", "subject_id", "title"],
  },
};

export const AGENT_TOOLS: AgentToolDef[] = toolsForSurface("chat").map((t) => ({
  name: t.name,
  label: t.label,
  description: t.description,
  kind: t.kind,
  area: t.area,
  inputSchema: INPUT_SCHEMAS[t.name] ?? { type: "object", properties: {} },
}));

export const AGENT_TOOLS_BY_NAME: Record<string, AgentToolDef> = Object.fromEntries(
  AGENT_TOOLS.map((t) => [t.name, t]),
);

export function isWriteTool(name: string): boolean {
  return TOOL_CATALOG_BY_NAME[name]?.kind === "write";
}
