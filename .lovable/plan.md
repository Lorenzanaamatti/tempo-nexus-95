# Interesante Compañía (IC) — Plan Fase 1

Herramienta interna para una agencia de representación de compositores audiovisuales. Esta fase entrega: schema completo con RLS, auth con roles, **Módulo 1 (Cartera de Composers)** funcional y la dirección visual editorial. Paramos al terminar el Módulo 1 para revisar antes de continuar.

## 1. Reset del proyecto

Descartamos la implementación previa ("Lorenzana / Finanzas"):
- Borrar rutas y componentes de finanzas, analytics, cashflow, sidebar de 15 módulos, dashboard previo.
- Borrar (vía nuevas migraciones) las tablas `projects`, `budgets`, `budget_lines`, `invoices` y enums `invoice_*`. Conservamos `profiles` y la lógica de `handle_new_user`.
- Conservamos la infraestructura Supabase/TanStack ya cableada (cliente, auth-attacher, auth-middleware, router, login).

## 2. Schema de base de datos (migraciones nuevas)

### Roles (RBAC vía tabla aparte, security definer)
- enum `app_role`: `admin`, `composer`
- tabla `user_roles(user_id, role)` con `unique(user_id, role)`
- función `has_role(_user_id, _role)` SECURITY DEFINER
- función `current_user_is_admin()` SECURITY DEFINER
- ampliar `profiles` con `composer_id uuid null` (link al composer si el usuario es uno)

### Catálogos (lookup, seed inicial; admin gestiona)
- `music_styles(id, slug, label_es, label_ca, label_en)` — orquestal, electrónico, híbrido, jazz, folk, ambient, coral, world, electroacústico…
- `av_genres(id, slug, label_es/ca/en)` — drama, thriller, comedia, doc, animación, terror, romántico, histórico, sci-fi, publicidad, videojuego
- `languages(code, label_es/ca/en)` — semillas básicas
- `fee_ranges(id, code, label)` — consultar, A, B, C, D

### Núcleo: composers
- `composers`
  - id, owner_user_id (FK auth.users, nullable — el composer dueño de la ficha)
  - full_name, slug, photo_path (storage), city, country
  - bio_short (≤300), bio_long, birth_year
  - availability enum: `available | partial | unavailable`
  - next_available_on date null
  - fee_range_id FK
  - internal_notes (solo admin)
  - tags text[]
  - reel_url
  - search_tsv tsvector (generated) — full-text español sobre bio_short, bio_long, tags y filmografía agregada (mantenido por trigger)
  - created_at / updated_at
- `composer_styles(composer_id, style_id)` (N:M)
- `composer_genres(composer_id, genre_id)` (N:M)
- `composer_languages(composer_id, language_code)` (N:M)
- `composer_demos(id, composer_id, title, description, duration_seconds, url, category, position)`
- `composer_filmography(id, composer_id, title, year, production_company, director, format, country, url, position)`
  - `format` enum: `feature | series | doc | short | spot | game | other`
- `composer_awards(id, composer_id, title, year, note, position)`

### Storage
- bucket `composer-photos` (público, lectura abierta)
- bucket `composer-assets` (privado, audio/PDF) con policies por rol
- migraciones para policies storage.objects

### RLS (estricta)
- `composers`:
  - SELECT: `current_user_is_admin()` OR `owner_user_id = auth.uid()`
  - INSERT/UPDATE/DELETE: solo admin
  - UPDATE adicional: composer puede UPDATE de SU ficha pero solo en columnas permitidas → enforce con trigger `BEFORE UPDATE` que revierte cambios en `internal_notes`, `fee_range_id`, `slug`, `owner_user_id`, `tags`, y M:N de styles/genres (admin-only).
- Tablas hijas (`composer_demos`, `composer_filmography`, `composer_awards`, `composer_languages`):
  - SELECT/INSERT/UPDATE/DELETE: admin OR `composer.owner_user_id = auth.uid()`
- `composer_styles`, `composer_genres`: SELECT igual; mutaciones solo admin
- Catálogos: SELECT a `authenticated`; mutaciones solo admin
- `user_roles`: SELECT solo self + admin; mutaciones solo admin
- GRANTS explícitos para `authenticated` y `service_role` en cada tabla pública

### Triggers
- `handle_new_user`: crea profile y, si el email coincide con un `composers.owner_email` pre-cargado, asigna rol composer y vincula `profiles.composer_id`. Por defecto NO asigna admin.
- `touch_updated_at` en composers y catálogos
- `composer_search_tsv_update` (recalcula tsvector en `'spanish'` config)
- `composer_field_guard` (impide a no-admins tocar campos protegidos)

## 3. Autenticación y roles

- Email/password + **Google OAuth** vía `lovable.auth.signInWithOAuth("google")` + `configure_social_auth(["google"])`.
- Página `/login` (ya existe, se actualiza al lenguaje IC y al diseño nuevo).
- Layout `_authenticated` con doble gate: contexto + `supabase.auth.getUser()` en `beforeLoad`.
- Hook `useCurrentRole()` que lee `user_roles` (cacheado con React Query).
- Layout `_authenticated/_admin` con `beforeLoad` que redirige a `/me` si el rol no es admin.
- Bootstrap del primer admin: documentado en README + script SQL en migración inicial que promueve un email semilla (lo pediremos como dato al implementar).

## 4. Módulo 1 — Cartera de Composers (admin)

### Rutas
- `/_authenticated/_admin/composers` — índice con tabs **Grid** / **Lista**
  - Sidebar de filtros: estilos (multi), géneros (multi), disponibilidad, idiomas, fee range, tags
  - Buscador full-text (debounced, query a Postgres usando `search_tsv @@ plainto_tsquery('spanish', ?)`)
  - Vista Grid: tarjetas con foto, nombre, ciudad, 3 tags principales, badge de disponibilidad
  - Vista Lista: tabla densa ordenable
- `/_authenticated/_admin/composers/new` — crear composer (admin)
- `/_authenticated/_admin/composers/$composerId` — ficha completa (read + edit inline por secciones)
  - Secciones: Identidad · Estilos & Géneros · Disponibilidad & Tarifa · Reel · Demos · Filmografía · Premios · Idiomas · Tags · Notas internas (solo admin)
  - Upload de foto a `composer-photos`
  - Editor de demos / filmografía / premios con drag-to-reorder (position)
  - Embed YouTube/Vimeo en el reel principal

### Server functions (`src/lib/composers.functions.ts`)
- `listComposers({ filters, search })` — admin only
- `getComposer(id)` — admin o owner
- `upsertComposer(input)` — admin
- `updateComposerSelf(input)` — composer-only, valida campos permitidos
- `addDemo / updateDemo / deleteDemo / reorderDemos`
- equivalentes para filmography, awards, languages
- `setComposerStyles / setComposerGenres` — admin
- `listCatalogs()` — styles, genres, languages, fee_ranges
- `getSignedAssetUrl(path)` para bucket privado

Todas con `requireSupabaseAuth`; RLS hace de backstop.

### Componentes nuevos
- `ComposerCard`, `ComposerListRow`, `ComposerFilters`, `ComposerForm`, `DemoEditor`, `FilmographyEditor`, `AwardsEditor`, `AvailabilityBadge`, `RoleGate`, `PhotoUploader`, `MultiSelectChips`.

## 5. Dirección visual (editorial, no SaaS)

Aplicada en `src/styles.css`:

- **Tipografía**:
  - Display/titulares: **Cormorant Garamond** (serif editorial)
  - Cuerpo: **Inter Tight** (sans neutro, alta legibilidad)
  - Mono: JetBrains Mono (solo metadatos)
- **Paleta dark cálida** (OKLCH):
  - background `oklch(0.16 0.005 60)` — negro cálido
  - surface `oklch(0.20 0.006 60)` / elevated `oklch(0.24 0.008 60)`
  - foreground `oklch(0.94 0.01 70)` — marfil
  - muted `oklch(0.65 0.01 70)`
  - border `oklch(0.30 0.008 60)`
  - **acento principal**: burdeos `oklch(0.45 0.13 18)` con glow `oklch(0.55 0.16 18)`
  - acento alternativo configurable: verde oliva oscuro `oklch(0.50 0.07 120)` (toggle interno por si en la review preferimos oliva)
- **Componentes**:
  - Cards con borde 1px sutil, radius 4px (no 16px estilo SaaS)
  - Headings con tracking ajustado, números old-style cuando aplique
  - Espaciado generoso, líneas finas como separadores
  - Hover states discretos, sin sombras coloridas ni gradientes "neon"
- Inspiración: Sight & Sound, Cahiers du Cinéma, MUBI Notebook.

## 6. i18n y responsive (preparado, no completo en Fase 1)

- Instalar `i18next` + `react-i18next` con namespaces `common`, `composers`.
- Estructura de claves lista; **strings en ES** de entrada, EN/CA stub con fallback a ES. La traducción completa entra en fase posterior.
- Selector de idioma en el header (persistido en localStorage).
- Layout responsive: sidebar de filtros se vuelve drawer en <md, grid colapsa a 1 col, ficha en tabs verticales.

## 7. Fuera de alcance en Fase 1 (se hará después)

- Módulo 2: Panel del composer (vista limitada con su ficha + proyectos propuestos)
- Módulo 3: Pipeline de proyectos + Kanban
- Módulo 4: CRM de productoras
- Módulo 5: Dashboard de inicio
- Exportación PDF de pitch
- Notificaciones internas
- Traducciones completas CA/EN

## 8. Verificación al cerrar Fase 1

- Login admin → ver grid de composers, crear uno, subir foto, añadir demos/filmografía/premios, editar disponibilidad, buscar por texto y filtrar.
- Login como composer de prueba → solo ve su ficha, intentos de tocar `internal_notes` o `fee_range` se revierten por trigger.
- RLS verificada: query directa a otro composer como user-composer devuelve 0 filas.
- Linter Supabase sin warnings nuevos.

---

## Antes de empezar a implementar necesito 2 datos:

1. **Email del primer admin** para semilla de `user_roles` (puedes decirlo al aprobar el plan).
2. **Acento definitivo**: ¿burdeos o verde oliva oscuro? Si dudas, dejo burdeos por defecto y un token alternativo listo para cambiar en una línea.
