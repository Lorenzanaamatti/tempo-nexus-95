export const PRODUCTION_KIND_LABEL = {
  cine: "Cine",
  serie: "Serie",
  plataforma: "Plataforma",
  publicidad: "Publicidad",
  videojuego: "Videojuego",
  documental: "Documental",
} as const;

export type ProductionKind = keyof typeof PRODUCTION_KIND_LABEL;

export const PRODUCTION_STATUS_LABEL = {
  pitch_enviado: "Pitch enviado",
  negociacion: "Negociación",
  contrato_firmado: "Contrato firmado",
  fechas_rodaje: "Fechas rodaje",
  fechas_montaje: "Fechas montaje",
  entrega_visuales: "Entrega de visuales",
  corte_intermedio_1: "Corte intermedio 1",
  corte_intermedio_2: "Corte intermedio 2",
  corte_intermedio_3: "Corte intermedio 3",
  entrega_musica: "Entrega de la música",
  mezclas: "Mezclas",
  sprint_1: "Sprint 1",
  sprint_2: "Sprint 2",
  sprint_3: "Sprint 3",
  sprint_4: "Sprint 4",
  sprint_5: "Sprint 5",
  sprint_6: "Sprint 6",
  facturado: "Facturado",
  cobrado: "Cobrado",
} as const;

export type ProductionStatus = keyof typeof PRODUCTION_STATUS_LABEL;