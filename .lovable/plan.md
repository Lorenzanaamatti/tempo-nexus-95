# Plan: Transversal → Personas → Marketing

Tres fases secuenciales. Cada fase deja la app funcionando y abre la siguiente.

---

## FASE C — Unificar tablas transversales

Objetivo: que cualquier entidad (productora, compositor, festival, premio, plataforma, campaña…) pueda tener acciones y documentos sin duplicar tablas.

### C1. Tabla `actions` (polimórfica)
Sustituye / unifica `opportunity_actions` y futuras tareas dispersas.

Campos clave:
- `subject_type` (enum compartido con `calendar_events`: `production | composer | opportunity | contract | production_company | platform | festival | award | grant | campaign | person`)
- `subject_id`
- `title`, `notes`
- `due_date`, `done`, `done_at`
- `assignee_person_id` (miembro de IC responsable)
- `kind` (`tarea | seguimiento | llamada | email | reunión | marketing`)

Migración de datos: copiar `opportunity_actions` → `actions` con `subject_type='opportunity'`. Mantener la tabla vieja como `view` o eliminarla tras adaptar la UI.

### C2. Tabla `documents` (polimórfica)
Unifica `composer_documents` y `production_documents`.

Campos clave: `subject_type`, `subject_id`, `title`, `kind`, `url`, `storage_path`, `position`, `notes`.

Migración: copiar ambas tablas con su `subject_type` correspondiente. Adaptar `photo-gallery` y editores existentes a la tabla nueva.

### C3. Componentes reutilizables
- `<EntityActionsEditor subjectType subjectId />`
- `<EntityDocumentsEditor subjectType subjectId />`
- `<EntityCalendarPanel subjectType subjectId />` (envoltorio del `TimelineCalendar` ya existente)
- `<EntityContractsPanel subjectType subjectId />` (filtra `contracts` + `contract_counterparties`)

### C4. Calendario general
Añadir las acciones (`actions`) como nueva fuente en `src/lib/calendar-sources.ts`, con toggle.

---

## FASE A — Reorganizar PERSONAS Y EQUIPOS

Objetivo: tres entradas claras en el sidebar, mismo modelo `people`/`composers` por debajo.

### A1. Sidebar
Reemplazar la entrada actual por un grupo:

```text
PERSONAS Y EQUIPOS
  ├─ Roster          → /roster
  ├─ Equipo IC       → /team
  └─ Contactos CRM   → /people
```

### A2. Rutas

- `/roster` — listado segmentado de `composers` con filtros por: `roster_role` (compositor/artista/…), `tier`, `representation_status`, disponibilidad, estilos musicales, idiomas, rango de fees. Reutiliza la ficha existente `/composers/$id`.
- `/team` — listado de `people` con `role = 'ic_team'`. Doble vista:
  - "A quién represento" (agrupa por miembro IC → `composer_team_assignments`).
  - "Quién me lleva" (vista cruzada por representado).
  - Ficha de miembro IC en `/team/$personId` con pestañas Resumen, Asignaciones, Calendario, Acciones, Documentos (usando los componentes de C3).
- `/people` — listado actual, filtrado para excluir `ic_team` y `composer` por defecto (CRM externo: supervisores, productores, contactos).

### A3. Filtros del Roster
Añadir barra de filtros con chips persistidos en URL (`validateSearch`). Reutilizar catálogos existentes (`music_styles`, `fee_ranges`, `languages`).

---

## FASE B — Módulo MARKETING

Objetivo: capa transversal nueva, mismo patrón que Producciones/Contratos, integrada con calendario y finanzas.

### B1. Tablas

- `campaigns` — entidad de primer nivel: `name`, `objective`, `status` (`borrador|activa|pausada|cerrada`), `start_date`, `end_date`, `budget_amount`, `responsible_person_id`, `notes`.
- `campaign_targets` — N:N polimórfica (`campaign_id`, `subject_type`, `subject_id`) para apuntar a producciones, compositores, festivales, premios…
- `marketing_assets` — `campaign_id?`, `subject_type?`, `subject_id?`, `title`, `kind` (`reel|foto|nota_prensa|epk|social_post|otro`), `url`, `storage_path`, `published_at`.
- `media_outlets` — fichas de medios (nombre, tipo: prensa/radio/podcast/online, web, contactos).
- `media_coverage` — clipping: `media_outlet_id`, `subject_type`, `subject_id`, `title`, `url`, `published_at`, `notes`.
- `public_appearances` — entrevistas/charlas: `composer_id?`, `production_id?`, `media_outlet_id?`, `festival_id?`, `date`, `title`, `notes`.

Todas con RLS estándar: lectura por autenticados, escritura sólo admin (`current_user_is_admin()`).

### B2. Rutas

```text
MARKETING
  ├─ Campañas         → /marketing/campaigns
  ├─ Assets           → /marketing/assets
  ├─ Cobertura        → /marketing/coverage
  ├─ Apariciones      → /marketing/appearances
  └─ Medios           → /marketing/outlets
```

Ficha de campaña `/marketing/campaigns/$id` con pestañas Resumen, Targets (qué/quién promociona), Assets, Calendario, Acciones, Cobertura asociada, Finanzas (sprints de presupuesto).

### B3. Integración transversal

- `calendar-sources.ts`: añadir fuentes `campaign` (inicio/fin), `marketing_asset` (publicación), `media_coverage` (publicación), `public_appearance`.
- `billing_sprints` ya soporta cualquier subject vía `production_id`; ampliar a `subject_type` para vincular sprints a campañas.
- En la ficha de cualquier entidad (productora, compositor, festival, premio) aparece una pestaña **Marketing** que pregunta "campañas y coberturas donde aparezco" usando `campaign_targets` y `media_coverage`.

---

## Detalles técnicos

- Enum `subject_type` ampliado: añadir `opportunity, contract, production_company, platform, festival, award, grant, campaign, media_outlet, person` al enum existente usado por `calendar_events`.
- `contracts` recibe también `subject_type`/`subject_id` opcional para poder vincularse a entidades distintas de productora/compositor (festival, campaña…).
- Botón de guardado en todas las nuevas fichas: `<SaveButton floating />` (regla ya en memoria del proyecto).
- Migraciones siempre con `GRANT` a `authenticated` y `service_role`, RLS activa, políticas `current_user_is_admin()` para escritura.
- No tocar `src/integrations/supabase/client.ts` ni `types.ts` (auto-generados). Las queries usan `(supabase as any)` cuando golpean tablas recién creadas hasta que se regeneran los tipos.

---

## Orden de entrega

Cada fase = una entrega cerrada y revisable.

1. **C1+C2** migraciones + componentes reutilizables + adaptar lo que ya usa `opportunity_actions`/`composer_documents`/`production_documents`.
2. **C3+C4** integración en fichas existentes + calendario.
3. **A1+A2+A3** sidebar, tres rutas, filtros del Roster, ficha de miembro IC.
4. **B1** migraciones de Marketing.
5. **B2** rutas e índices.
6. **B3** integración con calendario, finanzas y pestañas cruzadas.

Después de la fase C confirmamos antes de seguir, por si quieres ajustar nomenclatura o campos.
