/** Constantes del cuadro de mando de empresa (/empresa/kpis). */

export const OBJETIVO_METRICAS = [
  { key: "facturacion_anual", label: "Facturación anual", unit: "€" },
  { key: "fichajes", label: "Fichajes", unit: "nº" },
  { key: "reuniones_partners", label: "Reuniones con partners nacionales", unit: "nº" },
  { key: "reuniones_internacionales", label: "Reuniones internacionales", unit: "nº" },
  { key: "inversion_marketing", label: "Inversión en marketing", unit: "€" },
] as const;

export type ObjetivoMetrica = (typeof OBJETIVO_METRICAS)[number]["key"];

export const ROSTER_PROSPECT_ESTADOS = [
  "contactado",
  "reunion_mantenida",
  "oferta_enviada",
  "aceptado",
  "rechazado_ic",
  "rechazado_compositor",
] as const;
export type RosterProspectEstado = (typeof ROSTER_PROSPECT_ESTADOS)[number];
export const ROSTER_PROSPECT_ESTADO_LABEL: Record<RosterProspectEstado, string> = {
  contactado: "Contactado",
  reunion_mantenida: "Reunión mantenida",
  oferta_enviada: "Oferta enviada",
  aceptado: "Aceptado",
  rechazado_ic: "Rechazado por IC",
  rechazado_compositor: "Rechazado por compositor",
};
/** Orden del embudo: un estado cuenta para todos los escalones anteriores. */
export const ROSTER_PROSPECT_FUNNEL_RANK: Record<RosterProspectEstado, number> = {
  contactado: 1,
  reunion_mantenida: 2,
  oferta_enviada: 3,
  aceptado: 4,
  rechazado_ic: 2,
  rechazado_compositor: 3,
};

export const INTL_TIPOS = ["productora", "plataforma", "supervisor_musical", "otro"] as const;
export type IntlTipo = (typeof INTL_TIPOS)[number];
export const INTL_TIPO_LABEL: Record<IntlTipo, string> = {
  productora: "Productora",
  plataforma: "Plataforma",
  supervisor_musical: "Supervisor musical",
  otro: "Otro",
};

export const INTL_PROPUESTA_ESTADOS = [
  "sin_propuesta",
  "propuesta_enviada",
  "aceptada",
  "rechazada",
  "en_curso",
] as const;
export type IntlPropuestaEstado = (typeof INTL_PROPUESTA_ESTADOS)[number];
export const INTL_PROPUESTA_ESTADO_LABEL: Record<IntlPropuestaEstado, string> = {
  sin_propuesta: "Sin propuesta",
  propuesta_enviada: "Propuesta enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  en_curso: "En curso",
};

export const CAMPAIGN_CANALES = [
  "instagram",
  "linkedin",
  "prensa",
  "festival",
  "publicidad_pagada",
  "email",
  "otro",
] as const;
export type CampaignCanal = (typeof CAMPAIGN_CANALES)[number];
export const CAMPAIGN_CANAL_LABEL: Record<CampaignCanal, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  prensa: "Prensa",
  festival: "Festival",
  publicidad_pagada: "Publicidad pagada",
  email: "Email",
  otro: "Otro",
};

export const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Agrupación de tipos de producción para los gráficos del cuadro de mando. */
export function productionGroup(kind: string | null | undefined): string {
  switch (kind) {
    case "cine":
      return "Película";
    case "serie":
      return "Serie";
    case "publicidad":
      return "Publicidad";
    case "videojuego":
      return "Videojuego";
    default:
      return "Otro";
  }
}

export function yearOptions(): number[] {
  const max = new Date().getFullYear() + 1;
  const out: number[] = [];
  for (let y = max; y >= 2022; y--) out.push(y);
  return out;
}