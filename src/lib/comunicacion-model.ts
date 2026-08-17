import type { Option } from "@/components/record-table";

export const TEMPLATE_TIPOS: Option[] = [
  { value: "contrato", label: "Contrato" },
  { value: "deal_memo", label: "Deal Memo" },
  { value: "adenda", label: "Adenda" },
  { value: "contrato_laboral", label: "Contrato Laboral" },
  { value: "contrato_proveedor", label: "Contrato Proveedor" },
  { value: "presupuesto", label: "Presupuesto" },
  { value: "email_cliente", label: "Email cliente" },
  { value: "email_produccion", label: "Email producción" },
  { value: "email_proveedor", label: "Email proveedor" },
  { value: "comunicado_interno", label: "Comunicado interno" },
  { value: "otro", label: "Otro" },
];

export const TEMPLATE_IDIOMAS: Option[] = [
  { value: "castellano", label: "Castellano" },
  { value: "catalan", label: "Catalán" },
  { value: "ingles", label: "Inglés" },
  { value: "otro", label: "Otro" },
];

export const AGENTES_IA = ["AIDA", "AINARA", "AITANA", "AITOR"] as const;
export const AGENTE_OPTIONS: Option[] = AGENTES_IA.map((a) => ({ value: a, label: a }));

export const PUBLICACION_CANALES: Option[] = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "spotify", label: "Spotify" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "web", label: "Web" },
  { value: "newsletter", label: "Newsletter" },
  { value: "prensa", label: "Prensa" },
  { value: "otro", label: "Otro" },
];

export const PUBLICACION_TIPOS: Option[] = [
  { value: "post", label: "Post" },
  { value: "story", label: "Story" },
  { value: "reel", label: "Reel" },
  { value: "newsletter", label: "Newsletter" },
  { value: "nota_prensa", label: "Nota de prensa" },
  { value: "entrevista", label: "Entrevista" },
  { value: "comunicado", label: "Comunicado" },
  { value: "otro", label: "Otro" },
];

export const PUBLICACION_ESTADOS: Option[] = [
  { value: "borrador", label: "Borrador" },
  { value: "programado", label: "Programado" },
  { value: "publicado", label: "Publicado" },
];

export const OBLIGACION_ESTADOS: Option[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "completada", label: "Completada" },
  { value: "vencida", label: "Vencida" },
];

export const CAMPANA_TIPOS: Option[] = [
  { value: "digital", label: "Digital" },
  { value: "prensa", label: "Prensa" },
  { value: "sinc", label: "Sinc" },
  { value: "festival", label: "Festival" },
  { value: "academica", label: "Académica" },
  { value: "otra", label: "Otra" },
];

export const CAMPANA_ESTADOS: Option[] = [
  { value: "planificada", label: "Planificada" },
  { value: "activa", label: "Activa" },
  { value: "completada", label: "Completada" },
  { value: "pausada", label: "Pausada" },
  { value: "cancelada", label: "Cancelada" },
];

export const CANALES_MARKETING: Option[] = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "spotify", label: "Spotify" },
  { value: "prensa", label: "Prensa" },
  { value: "otro", label: "Otro" },
];

export const REDES_SOCIALES = ["Instagram", "LinkedIn", "Spotify", "TikTok", "YouTube", "Facebook", "Otro"] as const;

export const PLATAFORMAS_METRICAS = ["Instagram", "LinkedIn", "Spotify", "TikTok", "YouTube", "Facebook"] as const;
export const CHECKLIST_PLATAFORMAS = ["Reelcrafter", "Web", "IMDb", "Spotify for Artists"] as const;

/** Extrae los placeholders {{variable}} de un texto de plantilla. */
export function extractVariables(content: string): string[] {
  const out = new Set<string>();
  for (const m of content.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) out.add(m[1]);
  return [...out];
}

export const IC_ROLES: Option[] = [
  { value: "direccion", label: "Dirección" },
  { value: "representacion", label: "Representación" },
  { value: "produccion", label: "Producción" },
  { value: "administracion", label: "Administración" },
  { value: "marketing", label: "Marketing" },
  { value: "comunicacion", label: "Comunicación" },
  { value: "legal", label: "Legal" },
  { value: "otro", label: "Otro" },
];

export const CONTRATO_TIPOS: Option[] = [
  { value: "laboral_indefinido", label: "Laboral indefinido" },
  { value: "laboral_temporal", label: "Laboral temporal" },
  { value: "freelance", label: "Freelance" },
  { value: "proveedor", label: "Proveedor" },
  { value: "otro", label: "Otro" },
];

export function optionLabel(options: Option[], value: string | null | undefined) {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
