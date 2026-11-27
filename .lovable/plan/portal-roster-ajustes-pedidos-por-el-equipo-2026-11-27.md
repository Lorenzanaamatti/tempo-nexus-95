# Portal ROSTER: ajustes pedidos por el equipo

Los cambios anteriores (coautorías, quitar histórico antiguo, aviso de precios) **no resuelven** ninguno de estos puntos; todos son nuevos.

## 1. Proyectos · En marcha
- Cada tarjeta: título, debajo productora, debajo director (en vez de todo en una línea).
- En «b. Gastos · Concepto» el artista puede marcar **Fra. recibida** y **Fra. pagada** de sus gastos (son las columnas que existen en Gastos; Ingresos usa enviada/cobrada). Solo esas dos casillas; el resto sigue en solo lectura.

## 2. Proyectos · Calendario de trabajo
- Selector **Día / Semana / Mes / Año**. En Día, Semana y Mes solo aparecen proyectos y fases activos en ese periodo, con flechas para avanzar y retroceder.
- Fases marcadas como «Retrasado»: color de aviso (borde rojo + icono) en el calendario **y** aviso en Inicio.

## 3. Inicio
- Quitar Estado, Tier y Renovación de la vista del artista (siguen visibles para BIG C/TEAM).
- **Próximo hito** pasa a mostrar automáticamente las entregas destacadas de los próximos 10 días de sus producciones activas, más los avisos de fases retrasadas.
- Debajo, **sus tareas**: tareas que BIG C asigna al artista desde «Tareas vinculadas». El artista las ve y puede marcarlas como hechas, pero nunca crearlas.
- En BIG C, el selector de responsable de una tarea incluye también a los compositores.

## 4. Facturación · Resumen · Detalle de producción
- Facturación, % IC y Comisión IC salen de los mismos cálculos que «Seguimiento económico y financiero» de la ficha de producción (precio de venta, modo de comisión pct/fijo, base precio/margen), no de campos antiguos. Se elimina también aquí el histórico antiguo.

## 5. Gastos pagados por la agencia
- Nueva casilla en cada gasto: «Lo abona la agencia (extraordinario)».
- En KPIs y liquidación del artista esos gastos no restan de su beneficio y aparecen aparte como «Gastos extraordinarios asumidos por IC».

## 6. Tablas en toda la app
- Cabeceras de columna clicables para ordenar A‑Z/Z‑A y fechas de más antigua a más reciente, y filtro de periodo (desde/hasta) en las tablas con fechas. Se hará con un componente común y se aplicará primero a las tablas principales (producciones, tareas, facturación, CRM, roster), y después al resto.

## Pendiente aparte (archivo adjunto)
- Ficha del compositor: quitar la edición de «Ubicación actual» bajo el nombre; se rellena solo desde «Datos y dirección» con ciudad + provincia + país.

## Detalles técnicos
- RLS: el artista podrá actualizar únicamente las columnas de factura recibida/pagada de `production_finance_lines` tipo gasto de producciones accesibles (función SECURITY DEFINER `portal_set_expense_invoice_flags`), sin abrir UPDATE general.
- Nueva columna `production_finance_lines.paid_by_agency boolean default false`.
- Tareas: `actions.assignee_person_id` ya apunta a `people`; los compositores existen en `people` vía `sync_composer_to_people`. Política SELECT/UPDATE (solo estado) para el artista sobre tareas asignadas a su persona.
- Gantt: añadir modos de zoom a `ProductionGanttPanel`; retraso leído del mismo campo que muestra «Retrasado» en `milestones-editor`.
- Comisión: extraer el cálculo de `production-finance.tsx` a `src/lib` y reutilizarlo en portal facturación y KPIs.
- Componente `SortableTable`/hook `useTableSort` + filtro de rango de fechas.
