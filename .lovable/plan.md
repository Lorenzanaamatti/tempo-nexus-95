# Seguimiento económico y financiero (sustituye a «Gastos de producción»)

Sigo tu orden de entrega: primero el diseño, después la migración y al final la implementación. Cada paso espera tu aprobación.

## Paso 1 — Imagen a pantalla completa (lo primero, sin tocar la app)
- Una imagen fiel de la tabla a pantalla completa (sin menú lateral), con datos de ejemplo: bloques a–e, columnas A–I, cabeceras grises, «Importe final» en negrita, totales en negrita, todo en negro, 30.000,00 € y 26,4 %.
- Fila «Fee agencia IC» con selector de base, % editable y casillas «Facturado/Pagado».
- Te la enseño y espero tu visto bueno.

## Paso 2 — Datos actuales y propuesta de migración
Hoy en «Gastos de producción» hay **22 líneas en 6 producciones**. Cada línea guarda: concepto, descripción, presupuestado, coste real, fecha, proveedor (texto libre) y compositor.
Propuesta (sin borrar nada; la tabla antigua se queda como copia de seguridad):
- Cada línea pasa a ser un gasto: concepto → A, proveedor → B (enlazado a la ficha del proveedor; se crea si no existe), presupuestado → Importe inicial, coste real → Importe final, fecha → mes/año, descripción → notas de la línea.
- «Fee agencia» como gasto: propongo pasarlo a la fila d (Fee agencia IC) en vez de dejarlo como gasto. (Ver dudas.)
- El precio de venta actual de cada producción → «Fee composición» (inicial y final).
- Fra. recibida / pagada empiezan sin marcar.
- La base y el % de comisión que ya hay en la ficha (precio/margen) se traducen a «% s/ ingresos» / «% s/ margen operativo».

## Paso 3 — Implementación (tras aprobar 1 y 2)
- Tabla nueva en todas las producciones, botón de pantalla completa, columna A fija y desplazamiento horizontal.
- Cada línea es un registro propio vinculado a producción, compositor, cliente/proveedor, concepto y mes/año (editable en el detalle).
- Catálogo de conceptos de gasto; alta rápida de clientes y proveedores.
- Fee IC en ambos sentidos (% ↔ importe), recordando el último dato tecleado.
- Ficha de proveedor: «Historial de servicios». Ficha de cliente: «Historial de ingresos». Con filtros por año, producción y compositor, totales y enlace a la producción. Editables desde ahí.
- Ficha del compositor: resumen por producción (inicial y final).
- Borrar una línea pide confirmación.
- Respetando la autorización de la ficha, el aviso de cambio de motivos no aplica a estos importes salvo que lo pidas.

## Dudas (respóndelas cuando veas la imagen)
1. Decidido: el «Fee agencia» que hoy está como gasto pasa a la fila d (Fee agencia IC).
2. El «Precio de venta» de Datos principales: ¿debe ser igual a Fee composición (se sincronizan) o son cosas distintas?
3. Ficha hermana (varios representados): ¿cada ficha tiene su propia tabla, como ahora el dinero? Supongo que sí.
4. «Cliente» en ingresos: ¿se elige entre productoras/partners y cuentas, o queréis un CRM de clientes propio?
5. Hoy la parte económica solo la ve BIG C. ¿La nueva tabla también solo BIG C, o la ve Team? ¿Y los historiales en proveedores/clientes?
6. Este cambio deja de pintar rojo/verde aquí, y otras pantallas siguen con negativos en rojo. ¿Solo esta tabla en negro, verdad?

## Detalle técnico
- Nueva tabla de líneas (tipo ingreso/gasto, subtipo fee composición/producción/otros, nombre, client_id, provider_id, concept_id, importes inicial/final, period date, flags fra.), tabla de catálogo de conceptos, campos en producción para base/% inicial/final y «último dato manual». Migración aditiva desde `production_expenses`, que se marca como obsoleta sin borrarla.
