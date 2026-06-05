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
  compositor_confirmado: "Compositor confirmado",
  compositor_descartado: "Compositor descartado",
  presupuesto_enviado: "Presupuesto enviado",
  presupuesto_confirmado: "Presupuesto confirmado",
  contrato_enviado: "Contrato enviado",
  contrato_negociacion: "Contrato en negociación",
  contrato_firmado: "Contrato firmado",
  visuales_entregados: "Visuales entregados",
  en_composicion: "En composición",
  en_produccion: "En producción",
  en_mezclas: "En mezclas",
  entrega_parcial: "Entrega parcial",
  entrega_total: "Entrega total",
  entregables_completados: "Entregables completados",
  finalizada: "Finalizada",
  estrenada: "Estrenada",
  comunicado_estreno: "Comunicado estreno",
  nominada: "Nominada",
  premiada: "Premiada",
  comunicada_nominacion: "Comunicada nominación",
  comunicado_premio: "Comunicado premio",
} as const;

export type ProductionStatus = keyof typeof PRODUCTION_STATUS_LABEL;