## Apartado DEAL MEMOS — interfaz completa

Ampliación del apartado actual `Contratos y Deal Memos` añadiendo una sección dedicada con sub-navegación, Kanban, ficha completa con tabs, gestor de plantillas y contactos, y vista pública de aprobación. Solo UI + persistencia CRUD: IA, email, calendario y tokens reales quedan para bloques posteriores (placeholders con toast "Función disponible en Bloque X").

## Decisiones clave
- **Reaprovecho** las tablas existentes (`deal_memos`, `deal_memo_versiones`, `deal_memo_eventos`, `dm_plantillas`, `dm_contactos`). El esquema ya cubre todos los campos pedidos. No se necesitan migraciones nuevas salvo un pequeño helper SQL (ver más abajo).
- **Sub-navegación** (no un sidebar global nuevo): añado un layout `/_authenticated/_admin/deal-memos.tsx` con cabecera + tabs/links horizontales (Dashboard, Lista, Plantillas, Contactos, Configuración). El sidebar principal de la app se conserva; el bloque luce coherente con el resto sin romper el shell.
- **Vista pública** `/aprobar/$token` se monta fuera de `_authenticated` (ruta pública, layout propio).
- **Numeración correlativa** anual (`DM-IC-YYYY-NNN`, arranque 011 en 2026): la calculo en cliente al crear, leyendo el máximo correlativo del año via `supabase.from('deal_memos').select('referencia')`. Si el resultado es < 11, arranco en 011.
- **Idioma**: textos en español, fechas con `date-fns/locale/es` (ya disponible via dependencias del proyecto; si no, `bun add date-fns`).
- Las placeholders de IA / email / token muestran `toast("Función disponible en Bloque N")`.

## Rutas que se crearán / modificarán

```text
src/routes/_authenticated/_admin/
  deal-memos.tsx                  (NUEVO: layout con sub-nav + <Outlet/>)
  deal-memos.index.tsx            (REEMPLAZADO: Dashboard Kanban)
  deal-memos.lista.tsx            (NUEVO: vista tabla)
  deal-memos.plantillas.index.tsx (NUEVO)
  deal-memos.plantillas.$id.tsx   (NUEVO: editor)
  deal-memos.contactos.tsx        (NUEVO)
  deal-memos.configuracion.tsx    (NUEVO: placeholder)
  deal-memos.$dealMemoId.tsx      (REESCRITO: ficha con tabs)
src/routes/
  aprobar.$token.tsx              (NUEVO: vista pública mobile-first)
```

## Componentes principales (`src/components/deal-memos/`)
- `deal-memo-subnav.tsx` — barra horizontal con `Link`s activos
- `kanban-board.tsx` + `kanban-card.tsx` — 6 columnas con scroll interno, badge urgencia por borde izquierdo
- `deal-memo-form.tsx` — formulario de la pestaña Datos (modo solo-lectura si estado ≠ borrador)
- `deal-memo-versions.tsx` — lista expandible de versiones
- `deal-memo-timeline.tsx` — timeline vertical de eventos
- `deal-memo-notes.tsx` — textarea con auto-save (debounce 3s)
- `deal-memo-actions.tsx` — barra contextual según estado + menú `...` (Duplicar, Cancelar, Exportar)
- `plantilla-form.tsx`, `contacto-dialog.tsx`
- `estado-badge.tsx`, `format-money.ts`, `format-date-es.ts` (helpers)

## Tabla / migración
Migración pequeña para una RPC opcional `next_dm_reference(year int)` que devuelva el siguiente correlativo de forma atómica (evita colisiones). Si se considera innecesario, se calcula en cliente. Lo incluyo como migración separada y segura.

## Datos semilla
Inserto vía `supabase.insert` (no migración, son datos):
- 3 contactos: "Acceso a la base de datos (CRM) de equipo IC", "...productoras", "...clientes" (tipo `cliente`/`contraparte` según corresponda)
- 3 plantillas: "Deal Memo Representación", "Deal Memo Presupuesto Producción", "Deal Memo Cesión de Derechos" con asunto/cuerpo de muestra y `activa = true`
- 4–6 deal memos mock distribuidos por estados para poblar el Kanban, con eventos y versiones de ejemplo

## Detalles de calidad
- Skeletons (`Skeleton` de shadcn) durante `isLoading`
- Empty states con icono Lucide + texto gris
- Tooltips en iconos (`@/components/ui/tooltip`)
- Formato `85.000 €` con `Intl.NumberFormat('es-ES')`
- Fechas relativas con `formatDistanceToNow(date, { locale: es, addSuffix: true })`
- Validación de formularios con `react-hook-form` + `zod` (ya en stack) y mensajes en español
- Toasts con `sonner`

## Fuera de alcance (placeholders)
- Generación IA real (ya existe `generateDealMemoVersion` server fn — la dejo conectada solo en ficha si el plantilla_id existe; si no, toast)
- Envío email, recordatorios, calendario, tokens de aprobación reales
- Auth real para `/aprobar/$token` (la ruta es pública, sin login)

## Entregable final
Al terminar, listo:
- Rutas creadas (con URLs)
- Componentes principales y su ubicación
- Datos semilla insertados (cantidad y referencias)
