// Catálogo único de herramientas de la app.
//
// Fuente de verdad compartida por las dos superficies:
//  - "chat": herramientas que los agentes virtuales (AIDA, AINARA…) pueden usar
//    dentro del chat interno (ver `src/lib/agent-tools.ts`).
//  - "mcp": herramientas expuestas al servidor MCP para agentes externos
//    (Claude, etc., ver `src/lib/mcp/*`).
//
// Los nombres, títulos, descripciones y áreas viven SOLO aquí: no los dupliques
// en los ficheros de implementación.

export type ToolSurface = "chat" | "mcp";
export type ToolKind = "read" | "write";
export type ToolArea = "legal" | "calendario" | "roster" | "produccion" | "finanzas" | "sistema";

export type ToolCatalogEntry = {
  name: string;
  label: string;
  description: string;
  kind: ToolKind;
  area: ToolArea;
  surfaces: ToolSurface[];
};

export const TOOL_AREA_LABEL: Record<ToolArea, string> = {
  legal: "Legal",
  calendario: "Calendario",
  roster: "Roster",
  produccion: "Producción",
  finanzas: "Finanzas",
  sistema: "Sistema",
};

export const TOOL_CATALOG: ToolCatalogEntry[] = [
  // ---------- Chat interno ----------
  {
    name: "find_composer",
    label: "Buscar compositor / artista",
    description:
      "Busca un compositor o artista del roster por nombre. Devuelve id, nombre completo, email y rol.",
    kind: "read",
    area: "roster",
    surfaces: ["chat"],
  },
  {
    name: "list_recent_deal_memos",
    label: "Listar deal memos recientes",
    description:
      "Devuelve los deal memos más recientes con su referencia, obra, importe propuesto y estado.",
    kind: "read",
    area: "legal",
    surfaces: ["chat"],
  },
  {
    name: "find_production",
    label: "Buscar producción",
    description: "Busca una producción IC por título. Devuelve id, título, año, tipo y compositor.",
    kind: "read",
    area: "produccion",
    surfaces: ["chat"],
  },
  {
    name: "propose_deal_memo",
    label: "Proponer borrador de deal memo",
    description:
      "Crea un BORRADOR de deal memo pendiente de aprobación. Necesita referencia única, obra, descripción del uso, importe propuesto en euros, email del destinatario final y plazo en días.",
    kind: "write",
    area: "legal",
    surfaces: ["chat"],
  },
  {
    name: "propose_calendar_event",
    label: "Proponer evento en calendario",
    description:
      "Crea un evento de calendario pendiente de aprobación. Indica título, fecha de inicio (YYYY-MM-DD), fecha fin, categoría y opcionalmente una nota.",
    kind: "write",
    area: "calendario",
    surfaces: ["chat"],
  },
  {
    name: "propose_action_task",
    label: "Proponer tarea (acción)",
    description:
      "Crea una tarea pendiente de aprobación, asociada a un compositor, producción u oportunidad.",
    kind: "write",
    area: "produccion",
    surfaces: ["chat"],
  },

  // ---------- Agentes externos (MCP) ----------
  {
    name: "whoami",
    label: "Quién soy",
    description:
      "Devuelve el id, email y rol (BIG C / TEAM / ROSTER) del usuario autenticado que llama al servidor MCP.",
    kind: "read",
    area: "sistema",
    surfaces: ["mcp"],
  },
  {
    name: "search_roster",
    label: "Buscar en el roster",
    description:
      "Busca personas del roster (compositores, artistas, supervisores, especialistas) por nombre. Devuelve id, nombre, rol y email.",
    kind: "read",
    area: "roster",
    surfaces: ["mcp"],
  },
  {
    name: "search_team_members",
    label: "Buscar miembros del equipo IC",
    description:
      "Busca personas del equipo interno (people) por nombre para obtener su UUID (útil como assignee_person_id o responsible_person_id).",
    kind: "read",
    area: "sistema",
    surfaces: ["mcp"],
  },
  {
    name: "list_deal_memos",
    label: "Listar deal memos recientes",
    description:
      "Devuelve los deal memos más recientes (referencia, obra, importe propuesto, estado). Respeta los permisos del usuario autenticado.",
    kind: "read",
    area: "legal",
    surfaces: ["mcp"],
  },
  {
    name: "list_calendar_events",
    label: "Listar eventos de calendario",
    description:
      "Devuelve eventos de calendario dentro de un rango de fechas. Respeta los permisos del usuario autenticado.",
    kind: "read",
    area: "calendario",
    surfaces: ["mcp"],
  },
  {
    name: "create_task",
    label: "Crear tarea",
    description:
      "Crea una tarea en el CRM (tabla actions). Se sincroniza automáticamente en el calendario. Requiere permisos de admin (BIG C).",
    kind: "write",
    area: "produccion",
    surfaces: ["mcp"],
  },
  {
    name: "create_target_account",
    label: "Crear cuenta objetivo",
    description:
      "Crea una nueva cuenta objetivo (cliente potencial) en el CRM. Requiere permisos de admin (BIG C).",
    kind: "write",
    area: "finanzas",
    surfaces: ["mcp"],
  },
  {
    name: "update_target_account",
    label: "Actualizar cuenta objetivo",
    description:
      "Modifica campos de una cuenta objetivo existente por id. Solo actualiza los campos enviados. Requiere permisos de admin (BIG C).",
    kind: "write",
    area: "finanzas",
    surfaces: ["mcp"],
  },
];

export const TOOL_CATALOG_BY_NAME: Record<string, ToolCatalogEntry> = Object.fromEntries(
  TOOL_CATALOG.map((t) => [t.name, t]),
);

export function toolsForSurface(surface: ToolSurface): ToolCatalogEntry[] {
  return TOOL_CATALOG.filter((t) => t.surfaces.includes(surface));
}

/** Metadatos (title/description) para `defineTool` del servidor MCP. */
export function mcpToolMeta(name: string): { title: string; description: string } {
  const t = TOOL_CATALOG_BY_NAME[name];
  if (!t) throw new Error(`Herramienta no catalogada: ${name}`);
  return { title: t.label, description: t.description };
}
