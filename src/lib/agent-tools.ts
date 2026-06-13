// Catálogo central de herramientas que los agentes virtuales (AIDA, AINARA, AITANA, AITOR…)
// pueden usar dentro del chat. Las herramientas "read" se ejecutan al vuelo. Las "write" se
// guardan como propuestas en `agent_actions` y requieren aprobación humana.

export type AgentToolKind = "read" | "write";

export type AgentToolDef = {
  name: string;
  label: string;
  description: string;
  kind: AgentToolKind;
  /** JSON Schema para Anthropic tools.input_schema. */
  inputSchema: Record<string, unknown>;
  /** Etiqueta corta del área para agrupar en la UI. */
  area: "legal" | "calendario" | "roster" | "produccion" | "finanzas";
};

export const AGENT_TOOLS: AgentToolDef[] = [
  // -------- READ --------
  {
    name: "find_composer",
    label: "Buscar compositor / artista",
    description:
      "Busca un compositor o artista del roster por nombre. Devuelve id, nombre completo, email y rol.",
    kind: "read",
    area: "roster",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Nombre o parte del nombre a buscar." } },
      required: ["query"],
    },
  },
  {
    name: "list_recent_deal_memos",
    label: "Listar deal memos recientes",
    description:
      "Devuelve los deal memos más recientes con su referencia, obra, importe propuesto y estado.",
    kind: "read",
    area: "legal",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 25, description: "Cantidad a devolver (máx 25)." },
        estado: { type: "string", description: "Filtrar por estado (ej: borrador, enviado, firmado)." },
      },
    },
  },
  {
    name: "find_production",
    label: "Buscar producción",
    description: "Busca una producción IC por título. Devuelve id, título, año, tipo y compositor.",
    kind: "read",
    area: "produccion",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },

  // -------- WRITE (requieren aprobación) --------
  {
    name: "propose_deal_memo",
    label: "Proponer borrador de deal memo",
    description:
      "Crea un BORRADOR de deal memo pendiente de aprobación. Necesita referencia única, obra, descripción del uso, importe propuesto en euros, email del destinatario final y plazo en días.",
    kind: "write",
    area: "legal",
    inputSchema: {
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
  },
  {
    name: "propose_calendar_event",
    label: "Proponer evento en calendario",
    description:
      "Crea un evento de calendario pendiente de aprobación. Indica título, fecha de inicio (YYYY-MM-DD), fecha fin, categoría y opcionalmente una nota.",
    kind: "write",
    area: "calendario",
    inputSchema: {
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
  },
  {
    name: "propose_action_task",
    label: "Proponer tarea (acción)",
    description:
      "Crea una tarea pendiente de aprobación, asociada a un compositor, producción u oportunidad.",
    kind: "write",
    area: "produccion",
    inputSchema: {
      type: "object",
      properties: {
        subject_type: {
          type: "string",
          enum: ["composer", "production", "opportunity"],
        },
        subject_id: { type: "string", description: "UUID del sujeto (compositor/producción/oportunidad)." },
        title: { type: "string" },
        notes: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["subject_type", "subject_id", "title"],
    },
  },
];

export const AGENT_TOOLS_BY_NAME: Record<string, AgentToolDef> = Object.fromEntries(
  AGENT_TOOLS.map((t) => [t.name, t]),
);

export function isWriteTool(name: string): boolean {
  return AGENT_TOOLS_BY_NAME[name]?.kind === "write";
}