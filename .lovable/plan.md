# Corregir la vista de calendario general (y aplicar 3 mejoras al resto de pantallas)

## 1. El logotipo de Interesante Compañía sustituye al texto en todas las cabeceras

Hoy varias pantallas escriben "INTERESANTE COMPAÑÍA" como cintillo (smallcaps) sobre el título. Ese cintillo se sustituye por el `<BrandLogo />` (el wordmark oficial ya existente) para que la marca aparezca siempre con su tipografía real.

Ficheros afectados (todos los cintillos de "Interesante Compañía"):

- `src/routes/_authenticated/_admin/calendar.tsx` (prop `eyebrow`, línea 122 y usos)
- `src/routes/_authenticated.tsx` (cabecera de barra superior)
- `src/routes/_authenticated/dashboard.tsx`
- `src/routes/_authenticated/portal/index.tsx`
- `src/routes/_authenticated/_admin/ic.tsx`
- `src/routes/_authenticated/_admin/deal-memos.tsx`
- Otros headers que reutilicen `CalendarBoard` u otros patrones con eyebrow textual (revisión final por búsqueda antes de tocar).

No se toca el texto cuando "Interesante Compañía" aparece dentro de párrafos, ayuda contextual, plantillas de correo o firmas legales ("Interesante Compañía SL"): ahí el nombre en texto es correcto.

## 2. Navegación del calendario: quitar "Hoy" y clarificar las flechas

Ahora hay tres controles arriba a la derecha (`‹ | Hoy | ›`) más una etiqueta ("07/2026") que confunden porque:

- "Hoy" no indica qué hace realmente (te devuelve al periodo actual).
- Las flechas avanzan/retroceden en la unidad de la vista activa (mes en la vista mes, trimestre en trimestre, etc.), no "el año".

Cambios propuestos:

- Eliminar el botón "Hoy". Cuando el rango visible no incluye la fecha actual, aparece un pequeño enlace textual "Volver a hoy" a la derecha del selector de rango (semana/mes/…).
- Las flechas conservan su función pero pasan a mostrar tooltip contextual: "Mes anterior / Mes siguiente", "Semana anterior / Semana siguiente", "Año anterior / Año siguiente", según la vista activa.
- La etiqueta del periodo (`07/2026`) pasa a mostrar mes en texto ("Julio 2026") en vistas mensuales o superiores, para que quede claro qué está mirando.

## 3. Mover tarjetas en cualquier vista de calendario cambia la fecha de la tarea

Alcance: sólo eventos que provienen de tareas (`calendar_events.source_kind = 'action'`). El resto de eventos (contratos, entregas, sprints, disponibilidad, publicaciones…) son espejo de otras tablas y no se moverán en esta iteración — se marcarán como "no arrastrables" con un cursor distinto.

Comportamiento por vista:

- **Vista Calendario (mes)**: arrastrar una tarjeta de tarea a otro día actualiza `actions.due_date` con el nuevo día. El trigger `sync_action_calendar` ya reescribe la fila de `calendar_events` automáticamente, así que la fecha del calendario y la de la tarea quedan siempre sincronizadas.
- **Vista Gantt**: arrastrar la barra horizontalmente a otro día hace lo mismo. Como las tareas son de un día, no se cambia la duración; sólo la fecha.
- **Vista Kanban**: las columnas del kanban actual son categorías (Operativo, Marketing, Facturación, Personal), no fechas, así que arrastrar entre columnas no tiene semántica de fecha. En su lugar, cada tarjeta de tarea muestra un mini-input de fecha ("entrega") que al cambiarlo actualiza `actions.due_date`.

En los tres casos:

- Se hace update optimista de las queries del calendario y de las listas de tareas para que la interfaz reaccione al instante.
- Si el servidor falla, se revierte y se muestra un toast con el error.
- La fecha nueva queda reflejada automáticamente en la ficha de la tarea (`/tareas`), porque leen `actions.due_date` directamente.

## Detalles técnicos

- Nueva utilidad `updateActionDueDate(id, newDate)` (helper local en `calendar.tsx` o en `src/lib/tasks-api.ts`) que hace `UPDATE actions SET due_date = $1 WHERE id = $2` a través del cliente Supabase y devuelve el error para el toast.
- `FlatCalendarEvent` gana dos campos opcionales: `sourceKind?: string` y `sourceActionId?: string | null`, tomados de `calendar_events`. Sólo las tarjetas con `sourceKind === 'action'` reciben `draggable`.
- `CalendarMonthGrid`: cada celda de día implementa `onDragOver`/`onDrop` y las tarjetas de acción `onDragStart`. En el drop se llama a `updateActionDueDate` con el `sourceActionId` y la fecha destino en formato ISO (`yyyy-MM-dd`, respetando zona local).
- `TimelineCalendar`: se añade drag horizontal sobre las barras `kind === 'tarea'` con snapping al tick del día visible.
- `CalendarKanban`: cada tarjeta de acción muestra `<input type="date" />` inline en lugar de la fecha estática.
- Después de un cambio de fecha exitoso, invalidar `queryKey: ["calendar-events-all", …]`, `["tasks", …]` y `["task-inbox"]` para que todas las listas se actualicen.
- No se modifica el trigger `sync_action_calendar`: al actualizar `actions.due_date`, el `AFTER UPDATE` reescribe la fila de `calendar_events` automáticamente.
- Permisos: no hay cambios de RLS; el `UPDATE` se hace con la sesión autenticada actual y las políticas existentes de `actions` ya lo permiten.
