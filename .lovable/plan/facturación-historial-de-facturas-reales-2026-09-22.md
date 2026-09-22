# Facturación: historial de facturas reales

Añadir a la pantalla de Facturación una tercera pestaña, **Facturas**, con el registro real de las facturas emitidas, filtrable por periodo y siempre asociada a una producción.

## Qué podrás hacer

- **Ver el historial completo** de facturas emitidas: número, fecha, cliente, producción, representado, importe, estado (emitida / cobrada / vencida / anulada) y fecha de cobro.
- **Filtrar por periodo** de dos formas: selector de año y mes (con filas agrupadas por mes y total de cada mes) o rango libre desde/hasta, con el total del rango.
- **Filtrar además** por estado, cliente, producción y representado, y buscar por número de factura.
- **Crear facturas de dos maneras**:
  - Automática: al marcar una orden de facturación como *Facturada*, se crea una factura por cada línea de la orden, ya asociada a su producción y cliente; tú solo completas número y fecha.
  - Manual: botón "Nueva factura" para registrar una factura suelta, eligiendo la producción de un desplegable.
- **Adjuntar el PDF** de cada factura: subir, previsualizar y descargar desde la ficha de la factura.
- **Marcar como cobrada** con su fecha, o anular.
- **Exportar** el listado filtrado a Excel y PDF.
- Desde la ficha de una producción se verán sus facturas, con enlace al historial.

## Detalle técnico

1. **Migración**
   - Tabla `billing_invoices`: `invoice_number` (único), `issue_date`, `period_year`, `period_month` (calculados por trigger desde `issue_date`), `production_id` (FK a `productions`, obligatoria salvo facturas manuales sin producción asignada — se permite null pero se avisa en la UI), `order_id` y `order_item_id` (FK opcionales a la orden origen), `sprint_id` opcional, `client_name`, `representative_name`, `concept`, `amount`, `status` (nuevo enum `billing_invoice_status`: emitida, cobrada, anulada), `paid_date`, `pdf_path`, `notes`, `created_by`, `last_edited_by`, timestamps con trigger `touch_updated_at`.
   - GRANT a `authenticated` y `service_role`; RLS con `current_user_is_staff()` para lectura y `current_user_is_big_c()` para escritura, igual que el resto de facturación.
   - Índices por `production_id`, `issue_date` y `status`.
   - Bucket privado `billing-invoices` para los PDF, con políticas sobre `storage.objects` limitadas a staff.
   - "Vencida" no se guarda: se deduce en pantalla (emitida + fecha de emisión anterior a hoy menos el plazo, sin `paid_date`).

2. **`src/routes/_authenticated/_admin/billing.tsx`**
   - Nueva pestaña `facturas` junto a Plan y Órdenes.
   - Nuevo componente `src/components/billing/invoices-view.tsx` con: barra de filtros (año/mes + rango libre + estado + búsqueda), tabla agrupada por mes con subtotales, KPIs del periodo (emitido, cobrado, pendiente), diálogo de alta/edición, subida y previsualización del PDF vía signed URL, y `ExportRowsButton` para Excel/PDF.
   - En `setOrderStatus`, cuando una orden pasa a `facturada`, insertar una fila en `billing_invoices` por cada `billing_order_items` (production_id, client_name, representative_name, concept, amount = commission_amount, status `emitida`, número vacío pendiente de completar), evitando duplicados por `order_item_id`.

3. **Ficha de producción** (`producciones.$productionId.tsx`): bloque "Facturas" de solo lectura con las facturas de esa producción y enlace a `/billing?tab=facturas&produccion=<id>`.

4. Comprobación final con `tsgo --noEmit` y build, más una verificación en el navegador del alta de una factura y del filtro por periodo.
