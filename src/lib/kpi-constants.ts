/** Constantes del cuadro de mando de empresa (/empresa/kpis). */

export const OBJETIVO_GRUPOS = [
  "Financiero",
  "Comercial nacional",
  "Internacional",
  "Roster",
  "Convocatorias",
  "Marketing y comunicación",
] as const;
export type ObjetivoGrupo = (typeof OBJETIVO_GRUPOS)[number];

export type ObjetivoMetricaDef = {
  key: string;
  label: string;
  unit: "€" | "nº" | "días";
  group: ObjetivoGrupo;
  /** Cuando el objetivo se cumple bajando (p. ej. días de cobro). */
  lowerIsBetter?: boolean;
  hint?: string;
};

export const OBJETIVO_METRICAS: readonly ObjetivoMetricaDef[] = [
  // Financiero
  { key: "facturacion_anual", label: "Facturación anual", unit: "€", group: "Financiero" },
  { key: "comisiones_ic", label: "Comisiones IC facturadas", unit: "€", group: "Financiero" },
  { key: "deal_memos_enviados", label: "Deal memos enviados", unit: "nº", group: "Financiero" },
  { key: "deal_memos_aceptados", label: "Deal memos cerrados / aceptados", unit: "nº", group: "Financiero" },
  { key: "dias_cobro", label: "Días medios de cobro", unit: "días", group: "Financiero", lowerIsBetter: true },
  // Comercial nacional
  { key: "pitchs_presentados", label: "Pitchs presentados (total)", unit: "nº", group: "Comercial nacional" },
  { key: "pitchs_composers", label: "Pitchs de representados presentados", unit: "nº", group: "Comercial nacional" },
  {
    key: "pitchs_por_composer",
    label: "Mínimo de pitchs por representado",
    unit: "nº",
    group: "Comercial nacional",
    hint: "Se mide sobre el representado con menos pitchs del año.",
  },
  {
    key: "vinculos_inter_ic",
    label: "Vínculos inter-IC (un representado trae trabajo a otro)",
    unit: "nº",
    group: "Comercial nacional",
  },
  { key: "cuentas_contactadas", label: "Cuentas objetivo contactadas", unit: "nº", group: "Comercial nacional" },
  { key: "reuniones_partners", label: "Reuniones con partners nacionales", unit: "nº", group: "Comercial nacional" },
  { key: "aliados_nuevos", label: "Nuevos potenciales aliados contactados", unit: "nº", group: "Comercial nacional" },
  { key: "artistas_contactados", label: "Artistas contactados (prospección)", unit: "nº", group: "Comercial nacional" },
  { key: "fichajes", label: "Artistas fichados", unit: "nº", group: "Comercial nacional" },
  // Internacional
  { key: "reuniones_internacionales", label: "Reuniones internacionales", unit: "nº", group: "Internacional" },
  { key: "propuestas_internacionales", label: "Propuestas internacionales enviadas", unit: "nº", group: "Internacional" },
  // Roster
  { key: "representados_activos", label: "Representados activos", unit: "nº", group: "Roster" },
  { key: "representados_con_produccion", label: "Representados con producción activa", unit: "nº", group: "Roster" },
  // Convocatorias
  { key: "subvenciones_solicitadas", label: "Subvenciones solicitadas", unit: "nº", group: "Convocatorias" },
  { key: "subvenciones_concedidas", label: "Subvenciones concedidas", unit: "nº", group: "Convocatorias" },
  { key: "festivales_inscritos", label: "Festivales con inscripción", unit: "nº", group: "Convocatorias" },
  { key: "premios_candidaturas", label: "Candidaturas a premios", unit: "nº", group: "Convocatorias" },
  { key: "apariciones_prensa", label: "Apariciones en prensa", unit: "nº", group: "Convocatorias" },
  // Marketing y comunicación
  { key: "inversion_marketing", label: "Inversión en marketing", unit: "€", group: "Marketing y comunicación" },
  { key: "campanas_lanzadas", label: "Campañas lanzadas", unit: "nº", group: "Marketing y comunicación" },
  { key: "publicaciones_realizadas", label: "Publicaciones realizadas", unit: "nº", group: "Marketing y comunicación" },
  {
    key: "obligaciones_cumplidas",
    label: "Obligaciones de comunicación cumplidas",
    unit: "nº",
    group: "Marketing y comunicación",
  },
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