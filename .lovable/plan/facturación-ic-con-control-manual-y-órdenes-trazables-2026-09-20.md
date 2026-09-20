# Facturación IC con control manual y órdenes trazables

## Objetivo
Convertir **Plan de facturación IC** en el centro operativo donde se combinan contratos, producciones, honorarios del cliente, porcentaje de IC, fechas e información financiera, sin perder la posibilidad de corregir cualquier dato manualmente.

## Qué se construirá

### 1. Plan de facturación combinado
- Mostrar en una misma línea: producción, productora/cliente, representado, contrato, importe que cobra el representado, fecha prevista de cobro, porcentaje de IC, comisión calculada, fecha prevista de factura IC, estado y referencia/enlace de la factura.
- Usar los datos existentes de producciones, contratos y sprints de facturación; no duplicar fichas ni obligar a volver a introducir información.
- Diferenciar visualmente el importe del representado y la comisión de IC.
- Permitir añadir líneas manuales cuando la facturación no proceda de una producción o contrato existente.

### 2. Cálculo y edición manual
- Calcular automáticamente la comisión como `importe del representado × porcentaje IC`.
- Permitir editar importe, porcentaje, comisión, fechas, concepto, cliente y observaciones.
- Marcar claramente qué valores son calculados y cuáles fueron modificados manualmente.
- Si cambia un contrato que afecta a una línea modificada, mostrar una decisión antes de alterar nada: **conservar el ajuste manual** o **recalcular con el contrato actualizado**.
- Guardar quién realizó cada ajuste, cuándo y el valor anterior.

### 3. Órdenes de facturación
- Crear una orden desde una o varias líneas seleccionadas, con número único, desglose económico, datos del cliente, representado, producción, contrato, concepto, fechas y observaciones.
- Permitir revisar y editar la orden antes de enviarla.
- Estados: borrador, enviada, facturada y anulada.
- Evitar envíos duplicados y mantener un historial completo de envíos y cambios.
- Enviar cada orden a **maggy@plus-music.com** y al correo de la persona que pulsa **Enviar orden**.
- Si ambos correos coinciden, enviar una sola copia.
- Al marcar una orden como facturada, actualizar la línea asociada sin borrar la trazabilidad.

### 4. Vista y controles
- Mantener la pantalla ancha y densa, con fondo blanco y títulos Aubergine.
- Añadir filtros por estado, fecha, cliente, representado y producción; búsqueda y exportación Excel/PDF.
- Incorporar selección múltiple para generar una orden combinada.
- Añadir ficha de cada orden con su historial y vínculos al contrato, producción y factura.
- Conservar los accesos actuales desde Empresa y Departamento financiero.

## Datos y seguridad
- Crear registros específicos para órdenes, líneas incluidas, ajustes manuales e historial de envíos.
- Restringir consulta y edición económica a BIG C, siguiendo los permisos actuales.
- Validar en el servidor la identidad y el correo del usuario que envía la orden.
- El envío de correo se ejecutará desde servidor y registrará destinatarios, fecha y resultado.
- Corregir la automatización actual para que no confunda la factura del representado con la factura de comisión IC.

## Verificación
- Probar el ejemplo: representado cobra 15.000 €, IC cobra 10 %, resultado 1.500 €, con fechas de cobro y factura independientes.
- Probar ajuste manual y posterior cambio contractual, confirmando que la app pregunta antes de recalcular.
- Probar orden individual y combinada, destinatarios Maggy + usuario conectado, prevención de duplicados y cambio a facturada.
- Comprobar permisos BIG C, exportaciones, enlaces y visualización en escritorio.
