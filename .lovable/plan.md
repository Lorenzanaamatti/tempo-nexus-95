
# Sistema de tareas (extendiendo `actions`)

## 1. Backend — migración única

Extender `public.actions` con 3 columnas nuevas:
- `area` enum: `roster | oportunidades | economico | legal | marketing | general | produccion | comunicacion` (nullable — las acciones viejas se quedan en null)
- `subarea` text (libre, ej. "Redes Sociales", "Contratos", "Caja")
- `entry_date` date (default `current_date`)
- `requester_user_id` uuid (default `auth.uid()` vía trigger BEFORE INSERT; nunca editable desde UI)

`title` pasa a ser **descripción** (ya lo es). `due_date`, `assignee_person_id`, `subject_type`/`subject_id` ya existen.

Sin RLS nueva: hereda la actual.

## 2. Componente global `NewTaskDialog`

Un único modal compartido, abierto desde:
- Botón **＋ NUEVA TAREA** en cada item del sidebar (Roster, Oportunidades, Económico, Legal, Marketing, General, Producción, Comunicación) → preabre con `area` precargada
- Botón en el header (sin área precargada)

Campos del modal:
- Descripción (textarea)
- Área (select, 8 opciones) + Subárea (texto libre con sugerencias)
- Responsable (select Equipo IC)
- Fecha de entrega (date)
- Vínculo opcional a entidad (selector tipo + búsqueda: roster→composer, oportunidades→opportunity, económico→production, legal→contract, marketing→campaign, comunicación→media_outlet, producción→production, general→ninguno)
- Fecha de entrada y solicitante: ocultos, automáticos

## 3. Pestaña "TAREAS" en `/me`

Nueva tab dentro de `/me`:
- **Asignadas a mí** (filtro `assignee_person_id` = persona del usuario actual)
- **Creadas por mí** (filtro `requester_user_id` = auth.uid())
- Filtros: estado (pendiente/hecho), área, fecha
- Acciones: marcar hecho, abrir entidad vinculada

Cross-walk usuario ↔ persona: `profiles.id` → `composers.owner_user_id` → `people.composer_id`. Para personal de IC sin composer, añadiré `people.user_id uuid` (FK a auth.users) en la misma migración.

## 4. Buzón de notificación (header, derecha)

Componente `TaskInboxBell`:
- `useQuery` con `refetchInterval: 60_000` → cuenta tareas asignadas a mí con `created_at > last_seen` Y `done = false`
- Badge rojo con número
- Popover: últimas 5 tareas nuevas + link "Ver todas" → `/me?tab=tareas`
- `last_seen` se guarda en `localStorage` por usuario (clave `tasks-last-seen-{userId}`)

## 5. Sidebar — botones NUEVA TAREA

En `app-sidebar.tsx`, cada `SidebarMenuItem` de las 8 áreas añade un `SidebarMenuAction` (botón "+") que abre `NewTaskDialog` con `area` precargada. Sin romper la navegación principal.

## Riesgos identificados (para tu conocimiento)

1. **`people.user_id` nuevo** — algunos usuarios del IC aún no tienen `person` asociada. Para ellos el filtro "asignadas a mí" devolverá 0 hasta enlazarlos. Añadiré una herramienta mínima en `/admin/users` para asociar persona ↔ usuario.
2. **Acciones viejas con area=null** — Aparecerán en listados sin filtro de área. Es OK; el usuario puede asignarles área editando.
3. **Subárea texto libre** — Vanessa puede escribir "Redes Sociales", "redes sociales", "RRSS". Mitigación: sugerencias autocomplete desde las subáreas ya usadas (`SELECT DISTINCT subarea FROM actions WHERE area = $1`).
4. **Polling 60s** — el usuario verá nuevas tareas con hasta 1 min de retraso. Aceptable según tu decisión.
5. **`requester_user_id` vs `assignee_person_id` asimetría** — Solicitante apunta a `auth.users`, responsable a `people`. Es lo correcto (no todo asignable es usuario del sistema), pero requiere dos joins distintos al renderizar nombres.
6. **El modal global necesita estado compartido** — uso un context provider `TaskDialogProvider` montado en `_authenticated.tsx`.

## Orden de implementación

1. Migración (columnas + enum + trigger requester + `people.user_id`)
2. `TaskDialogProvider` + `NewTaskDialog`
3. Botones "+" en sidebar
4. Pestaña `/me` → TAREAS
5. `TaskInboxBell` en header
6. Sugerencias de subárea
