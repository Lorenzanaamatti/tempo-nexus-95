# Revisión: cómo el portal ROSTER lee los proyectos

## Lo que encontré
- **KPIs**: lee las producciones reales del artista (como titular o asignado), el precio de venta y los gastos de la tabla económica. Bien encaminado.
- **Lo que hacemos por ti**: junta pitches, candidaturas, producciones (titular y asignado), prensa y gestiones manuales. Bien encaminado.
- **Mis proyectos**: todavía mezcla la tabla antigua `composer_projects` (legado), que no debería alimentar el portal.
- **Permisos**: un artista solo puede leer una producción, y su economía, si es el **titular**. Si está solo **asignado** (p. ej. segundo compositor), la producción no aparece en su portal aunque el código la pida. Hoy no afecta a nadie (las 105 asignaciones coinciden con el titular), pero fallará en cuanto haya coautorías.
- **Datos incompletos**: 55 de 105 producciones con artista no tienen precio de venta → en KPIs cuentan como 0 €.
- **Cálculo de gastos**: KPIs suma todos los gastos de la producción (salvo los de otro artista), sin distinguir gastos que paga la agencia.

## Cambios propuestos
1. Permitir que un artista vea las producciones donde está asignado (y sus líneas económicas), solo lectura, sin ampliar nada más.
2. Quitar `composer_projects` de «Mis proyectos»; usar solo producciones reales.
3. En KPIs, marcar «sin precio de venta» en las producciones sin importe en lugar de sumar 0 €, y mostrar cuántas faltan.
4. Unificar en un solo lugar la lectura «producciones de este artista» para portal, KPIs y Lo que hacemos por ti.

## Detalles técnicos
- Migración: ampliar políticas SELECT de `productions` y `production_finance_lines` con `EXISTS (production_assignments a WHERE a.production_id = … AND can_access_composer(a.composer_id))`. Escrituras sin cambios.
- Nuevo helper `fetchComposerProductions(composerId)` en `src/lib`, usado por `portal/kpis.tsx`, `portal/proyectos.tsx` y `agency-activity.tsx`.
- Comprobar con vista ROSTER de un artista concreto.
