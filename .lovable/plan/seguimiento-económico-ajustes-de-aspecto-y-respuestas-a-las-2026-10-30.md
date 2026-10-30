# Seguimiento económico — ajustes de aspecto y respuestas a las dudas

Mismo orden de antes: primero rehago la imagen con los cambios de aspecto, después la migración de los datos actuales y al final la app. Cada paso espera tu aprobación.

## 1. Cambios de aspecto (nueva imagen)
- Una fila vacía de separación entre cada capítulo: ingresos, gastos, margen operativo, fee agencia IC y resultado composer.
- Ingresos con las casillas «Factura enviada» y «Factura cobrada». Gastos con «Factura recibida» y «Pagada».
- La columna «Importe total» lleva un marco suave a su alrededor, de arriba abajo.
- Números sin colores: suman o restan con su signo. Donde haga falta para leer mejor, añado espacio, según tu criterio.

## 2. Exportar
- Botón «Exportar» con vista previa de la tabla antes de descargar, en Excel o PDF.

## 3. Orden de facturación de la liquidación (como Consultoría en Plusmusic HUB)
- Botón «Enviar orden de facturación» en la fila del fee agencia IC.
- Se envía por email a la misma persona que en Plusmusic HUB, con: producción, cliente al que se factura, concepto y liquidación (porcentaje, precio fijo, etc.).
- Antes de enviarlo verás el email. Queda anotado cuándo y quién lo envió.

## 4. Dónde se ven los totales
- Los totales de ingresos y gastos aparecen en la vista financiera de cada composer y de cada cliente.
- Las liquidaciones se pueden consultar desde el portal de cada composer.

## 5. Decisiones tomadas
1. Precio de venta = total de ingresos asignados a la productora. Están sincronizados y se pueden editar a mano en cualquiera de los dos sitios; se ve igual en ambos. Cada cambio guarda quién y cuándo, más un comentario con el motivo.
2. Cada ficha (también las hermanas) tiene su propia tabla y liquidación.
3. Cliente/proveedor: buscador que propone opciones al escribir unas letras, entre partners, productoras, clientes y cuentas; también se puede escribir a mano. Si se crea uno nuevo desde ahí, se abre su ficha en el CRM que corresponda. La ficha anota producción, mes y año, cliente asociado, importe, si se facturó/cobró (o pagó), sincronizado en los dos sentidos.
4. Team y BIG C lo ven todo. El composer ve en su portal la misma tabla de liquidación de cada una de sus producciones, pero nada de lo que hacemos con ese cliente o proveedor en otros proyectos.
5. El «Fee agencia» que hoy aparece como gasto pasa a la fila del fee agencia IC.

## Duda pendiente
- ¿A qué email exacto va la orden de facturación? No puedo ver la configuración de Plusmusic HUB desde aquí sin confirmarlo; si me dices la dirección, la uso. Si no, la busco en ese proyecto.

## Detalle técnico
- Separadores de capítulo y marco de la columna total solo en el diseño; sin color en importes de esta tabla.
- Export: Excel (xlsx) y PDF desde el navegador, con diálogo de vista previa.
- Orden de facturación: email de la app (requiere dominio de envío configurado) con registro de envíos por producción.
- Historial de cambios del precio de venta en el registro de cambios de producción, con comentario obligatorio.
- Portal del composer: lectura de líneas filtradas por sus producciones mediante permisos de base de datos.
- Migración aditiva desde los gastos actuales, sin borrar nada.
