# Vista Personal · mostrar tus tareas de verdad

Al abrir Calendarios → Personal se ejecutan tres filtros encadenados: sólo eventos de categoría `personal`, sólo eventos "míos", y sólo lo que esté en `calendar_events`. Ahora mismo fallan los tres para tus tareas reales.

## Diagnóstico

- **Las tareas sin proyecto no llegan al calendario.** El trigger `sync_action_calendar` salta cualquier tarea cuyo `subject_type/subject_id` sea nulo. Por eso "Preparar presupuesto 2026…" (que sí tiene fecha y responsable) no aparece en ningún calendario.
- **Tu usuario no está vinculado a la persona "Lourdes Hernández".** Esa fila de `people` no tiene ni `email` ni `user_id`, así que la búsqueda actual `people.email ilike auth.email` devuelve vacío y el filtro "Mis tareas" oculta todo.
- **El chip "Mis tareas" pasa desapercibido.** Estilo neutro, no llama la atención.
- **Las tarjetas del calendario no muestran descripción ni departamento** (`actions.notes`, `actions.area`).

## Cambios

### 1. Sincronizar tareas standalone al calendario (migración)

Reescribir `public.sync_action_calendar()` para que, cuando `subject_type IS NULL` pero `assignee_person_id IS NOT NULL`, cree igualmente la fila en `calendar_events` con `subject_type='person'`, `subject_id=assignee_person_id` y categoría `personal`. Si tampoco hay assignee, sigue saltándose (como hoy). Se relanza el trigger sobre las filas existentes con un `UPDATE actions SET updated_at = now() WHERE done = false AND due_date IS NOT NULL AND subject_type IS NULL AND assignee_person_id IS NOT NULL` para que las tareas ya creadas aparezcan sin recrearlas.

### 2. Vincular usuario ↔ persona (código, no migración de esquema)

En `src/routes/_authenticated/_admin/calendar.tsx`:

- `myPersonQ` primero busca `people.user_id = auth.uid()`; si no hay match, cae al match por email case-insensitive.
- Cuando `preset.key === 'personal'` y `myPersonQ` sigue devolviendo `null`, se muestra arriba del calendario un selector "Soy…" con la lista de `people` que aún no tienen `user_id`. Al elegir, hace `UPDATE people SET user_id = auth.uid() WHERE id = $1` (Lourdes es admin, las policies actuales lo permiten) y refresca la query. Con un clic dejas de tener que reescribir tu email.

### 3. Chip "Mis tareas" en rojo fluor

El botón "Mis tareas" pasa a rojo fluor (`#FF073A`) tanto activo como inactivo:

- Inactivo: borde rojo fluor + icono rojo fluor + texto oscuro.
- Activo: fondo rojo fluor + texto blanco + sombra tenue.

Se mantiene el icono `User2` y la posición actual.

### 4. Descripción y departamento en las tarjetas

- `actionsQ` pasa a seleccionar `id, area, subarea, notes` y se construye un mapa `actionsById`.
- `FlatCalendarEvent` gana `area?: string | null` y `description?: string | null`, poblados cuando `source_action_id` está presente.
- **Kanban**: cada tarjeta de tarea muestra un badge con el `area` (Operativo / Marketing / Facturación / Personal / Legal según enum) junto al kind, y la `description` ya se pinta a través del `note` actual (que ahora viene de `actions.notes`).
- **Mes**: tooltip enriquecido con `area · notes`.
- **Gantt**: mismo tooltip enriquecido.
- Cuando el `preset.key === 'personal'`, el layout inicial pasa de Gantt a **Kanban**, que es la vista con más espacio para leer descripción y departamento.

## Alcance

- Sólo se toca la vista Calendarios y su trigger de acciones. No cambian esquemas de tabla, RLS ni otros triggers.
- No se toca el flujo de creación de tareas ni el diálogo `new-task-dialog`.
- El helper `updateActionDueDate` y el drag & drop añadidos en la iteración anterior se mantienen sin cambios.
