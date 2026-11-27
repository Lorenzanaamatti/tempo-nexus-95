# Vistas coherentes con el rol elegido (BIG C → TEAM / ROSTER)

## Dónde hay datos económicos hoy

| Sección | Datos económicos | BIG C | TEAM | ROSTER |
|---|---|---|---|---|
| Empresa / Dashboard económico global | Ingresos, márgenes, caja | Sí | No | No |
| Plan de facturación global y Facturación (facturas reales por periodo) | Facturas, vencimientos, cobros | Sí | No | No |
| Comisiones por proyecto | Comisión IC pactada, facturada, cobrada, pendiente | Sí | No | No |
| Ficha de producción › Datos principales | Precio de venta | Sí | No | No |
| Ficha de producción › Económico / Seguimiento económico | Ingresos, gastos, Fee agencia IC, márgenes, liquidación | Sí | No | Solo su liquidación |
| Ficha de producción › Sprints de facturación | Trabajo representado y Comisión IC | Sí | No | Solo los suyos |
| Ficha de producción › Facturas | Facturas vinculadas | Sí | No | No |
| Paperwork (presupuestos, deal memos, contratos) | Importes de los documentos | Sí | Sí | Solo sus contratos |
| Oportunidades / Pitches | Importes estimados de la oportunidad | Sí | Sí | No |
| Ficha de roster | Rangos de honorarios | Sí | Sí | Hoy legibles (pendiente decidir) |
| Calendario › Facturación / Ocupación del roster | Vencimientos, cobros, meses sin ingresos | Sí | Sí (calendario) | No |
| Portal › Inicio, KPIs, Facturación, Proyectos | Sus importes, histórico y sprints | Sí | — | Solo lo suyo |

## Qué cambia

1. **La vista elegida manda.** Si BIG C elige TEAM, la app se comporta exactamente como una cuenta TEAM: mismo menú, mismas pantallas, y desaparecen Empresa, finanzas globales, Facturas y Datos económicos de producción, Usuarios, Agentes IA y Auditoría. Entrar por enlace directo a una pantalla reservada muestra el aviso de "sin acceso".
2. **Vista ROSTER = portal de un artista concreto.** Al elegir ROSTER se pide qué artista simular y se ve solo su portal (lo mismo que ve él), sin menú interno ni acceso a otras pantallas.
3. **Salida siempre visible.** Una barra fija "Estás viendo como TEAM / ROSTER (artista) — Volver a BIG C" permite regresar en un clic. Es la única diferencia con una cuenta real.
4. **Cuentas TEAM reales** reciben el menú de trabajo TEAM (hoy reciben por error el menú de "Mi portal").
5. Los datos y permisos reales no cambian: la simulación solo restringe, nunca amplía.

## Detalles técnicos

- `useCurrentRole()` devolverá un rol efectivo = el más restrictivo entre el rol real (`user_roles`) y `useSessionView()`; `isBigC/isTeam/isStaff` se calculan sobre el efectivo. Se añade `realRole` solo para la barra de salida y el selector de vista. Los 28 usos de `isBigC` heredan el comportamiento sin tocarlos uno a uno.
- Guardas de rutas `_admin` / BIG C y `app-sidebar.tsx` leen el rol efectivo; el menú de TEAM real usa la misma configuración que la vista TEAM.
- ROSTER simulado reutiliza `/portal?as=<composer_id>`; la vista guarda el artista elegido junto a `ic:session-view` y redirige cualquier ruta interna al portal.
- Server functions y RLS no se relajan; las comprobaciones en servidor siguen con el rol real (la simulación es solo de presentación restrictiva).
- Prueba con Playwright: BIG C → TEAM no ve Datos económicos ni Facturación; BIG C → ROSTER (Alfred Tapscott) solo ve su portal; volver a BIG C restaura todo.

## Ideas opcionales

- Limitar los rangos de honorarios al equipo interno para que ningún artista vea tarifas.
