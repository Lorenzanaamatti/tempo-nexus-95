/** Estados de producción que el portal considera «en marcha». */
export const ACTIVE_PRODUCTION_STATUSES = new Set<string>([
  "compositor_confirmado", "presupuesto_enviado", "presupuesto_confirmado",
  "contrato_enviado", "contrato_negociacion", "contrato_firmado",
  "visuales_entregados", "en_composicion", "en_produccion", "en_mezclas",
  "entrega_parcial", "entrega_total", "entregables_completados",
]);
