## Objetivo

Ampliar el módulo Calendario para que muestre la disponibilidad y asignaciones de **personas** (Equipo IC, Compositores, Artistas, Supervisores) y de **producciones**, con filtros combinables y vistas de duración variable (día → 3 años) en formato **timeline horizontal**.

---

## 1. Base de datos (nueva migración)

### Tabla `people`
Tabla unificada para todas las personas del ecosistema.
- `role`: enum `person_role` con valores `ic_team`, `composer`, `artist`, `supervisor`
- `full_name`, `email`, `phone`, `notes`
- `composer_id` (opcional, FK lógica): para enlazar una fila `person` con un compositor ya existente sin duplicar datos
- Para los compositores actuales: trigger/seed que cree automáticamente una fila en `people` con `role = 'composer'` y `composer_id` apuntando al original

### Tabla `productions`
- `title`, `kind` (película, serie, doc, spot, videojuego, otros), `year`, `production_company`, `director`, `platform`, `notes`, `color` (para distinguir en el calendario)

### Tabla `production_assignments`
Relaciona personas con producciones:
- `production_id`, `person_id`, `role_in_project` (compositor, artista invitado, supervisor, etc.), `start_date`, `end_date`

### Tabla `calendar_events`
Reemplaza el uso exclusivo de `composer_availability` para el calendario global. Mantiene `composer_availability` intacta (sigue alimentando la ficha del compositor) pero añadimos una tabla más general:
- `subject_type`: enum (`person`, `production`)
- `subject_id`: uuid (apunta a `people.id` o `productions.id`)
- `kind`: enum reutilizado (`libre`, `ocupado`, `vacaciones`, `personal`, `produccion`)
- `start_date`, `end_date`, `title`, `note`

Los periodos existentes de `composer_availability` se siguen mostrando en la ficha del compositor; el calendario global los lee uniendo ambas fuentes via vista SQL `calendar_entries_v`.

### RLS
- `people`, `productions`, `production_assignments`, `calendar_events`: lectura para `authenticated`, escritura solo `current_user_is_admin()`.

---

## 2. Nuevos módulos admin

### `/people`
CRUD simple: lista filtrable por rol, ficha con datos básicos. Para personas con `role = 'composer'` enlazadas, botón "Abrir ficha de compositor".

### `/productions`
Lista + ficha con: datos de la producción, asignaciones de personal (añadir/quitar personas y fechas), eventos del calendario asociados.

Ambos módulos se enlazan desde el sidebar (solo admin).

---

## 3. Calendario rediseñado (`/calendar`)

### Filtros (barra superior, multi-selección combinable)
- Toggles por categoría: **IC**, **Compositores**, **Artistas**, **Supervisores**, **Producciones**
- Multi-select de personas concretas (chips)
- Multi-select de producciones concretas (chips)
- Toggle por tipo de evento (libre, ocupado, vacaciones, personal, producción)

### Selector de rango de vista
Botones: **Día · Semana · Mes · Trimestre · Semestre · Año · 2 años · 3 años**
Navegación: ‹ hoy ›

### Layout timeline horizontal
```text
                  ┌─ rango temporal (cabecera con escala según vista) ─┐
Equipo IC
  Marta           │      ████ vacaciones        │
  Joan            │  ██ personal │              │
Compositores
  Compositor A    │       ████████ ocupado      │
  Compositor B    │ ████ libre │   ██ vacaciones│
Producciones
  "Película X"    │      ████████████████       │
  "Serie Y"      │ █████████ │                 │
```

- Filas agrupadas por categoría (cabecera colapsable).
- Cada fila = una persona o una producción.
- Barras de colores según `kind` (mismos colores que el editor de disponibilidad).
- Click en barra → navega a la ficha correspondiente.
- Hover → tooltip con título + rango + nota.
- Densidad de cabecera adaptada al rango (días para vista día/semana; semanas para mes/trimestre; meses para semestre/año+).

### Implementación
- Componente `TimelineCalendar` con virtualización ligera (filas) y cálculo de offsets con `date-fns`.
- Hook `useCalendarRange(view, anchor)` que devuelve `{ start, end, ticks, label }`.
- Query única que carga eventos solapando `[start, end]` aplicando filtros del lado del cliente (el volumen esperado es bajo).

---

## 4. Cambios menores

- `availability-editor.tsx`: añadir nuevo `kind` `produccion` (opcional, solo si el usuario quiere etiquetar un periodo como producción concreta).
- `app-sidebar.tsx`: añadir entradas "Personas", "Producciones" (solo admin); "Calendario" se queda.
- Mantener `composer_availability` y la ficha actual sin tocar la UX existente; el calendario global solo amplía su alcance.

---

## 5. Entregables

- 1 migración SQL (people, productions, production_assignments, calendar_events, vista, enums, RLS, grants, seed people desde composers).
- Rutas nuevas: `/_authenticated/_admin/people(.index|.new|.$id)`, `/_authenticated/_admin/productions(.index|.new|.$id)`.
- Componentes: `TimelineCalendar`, `CalendarFilters`, `PeopleEditor`, `ProductionEditor`, `ProductionAssignmentsEditor`.
- Reescritura de `calendar.tsx` para usar timeline + filtros + rangos.
- Sidebar actualizado.

---

## Notas

- Se conserva la lista por meses como vista de respaldo (botón "Lista") por si en pantallas pequeñas el timeline es estrecho.
- Si más adelante quieres edición inline en el propio calendario (arrastrar barras), se puede añadir en una segunda iteración; ahora la creación/edición se hace desde la ficha de la persona o de la producción.
