
# Vídeos en ficha + Módulo Redes Sociales IC

## 1. Vídeos en ficha de compositor

Reutilizamos la tabla existente `composer_demos` (que ya soporta `url`) extendida con almacenamiento propio. Mejor: una tabla limpia análoga a `composer_photos`.

**Nueva tabla `composer_videos`** (paralela a `composer_photos`, cap 12):
- `composer_id`, `storage_path` (bucket privado), `external_url` (YouTube/Vimeo opcional), `poster_path` (miniatura opcional), `title`, `duration_seconds`, `year`, `copyright`, `position`

Subida al bucket `composer-assets` (ya existe). Reproductor `<video>` nativo o embed si es URL externa.

**UI**: nueva sección "Vídeos" en la ficha admin del compositor, debajo de "Fotografías". Mismo patrón de grid + drag-reorder + borrar. En el portal del representado, se muestran en lectura.

## 2. Módulo Redes Sociales IC

Nueva sección en `/marketing/social` con sub-navegación por canal: **Instagram · Facebook · LinkedIn · YouTube · TikTok · Otras**.

Cada canal es un feed editorial de **posts planificables**, filtrables por **representado** y por **producción**.

### Modelo de post (`social_posts`)
- `channel`: enum (`instagram` | `facebook` | `linkedin` | `youtube` | `tiktok` | `otra`)
- `format`: enum (`feed` | `reel` | `story` | `carousel` | `video` | `live` | `articulo`)
- `composer_id` (nullable — opcional)
- `production_id` (nullable — opcional)
- `title` (interno)
- `copy_es`, `copy_en`, `copy_ca` — textos por idioma
- `hashtags` (text[])
- `cta` (texto + URL)
- `scheduled_for` (fecha y hora prevista)
- `published_at` (fecha real)
- `published_url` (link al post en la red)
- `status`: enum (`borrador` | `en_revision` | `aprobado` | `programado` | `publicado` | `archivado`)
- `owner_person_id` (responsable interno)
- `notes`

### Adjuntos (`social_post_assets`)
N por post:
- `kind`: `image` | `video` | `audio` | `gif` | `documento`
- `storage_path` o `external_url`
- `caption`, `alt_text`, `position`

### Otros recursos sugeridos (parte del módulo, no separado)
Propongo añadir, además del post en sí:
- **Variantes por canal**: un mismo concepto con copies distintos para IG/LinkedIn/etc. (campo `parent_post_id` para agrupar).
- **Stories y Reels**: como formatos del mismo modelo.
- **Campañas** (`social_campaigns`): agrupador de posts con objetivo, fechas y KPIs (alcance, engagement, leads).
- **Plantillas de copy** (`social_copy_templates`): copies tipo por tipo de hito (estreno, premio, BSO publicada, entrevista, evento) con variables `{compositor}`, `{producción}`, `{director}`, `{plataforma}`.
- **Calendario editorial**: vista mensual de `social_posts.scheduled_for` con filtro por canal/representado/producción.
- **Briefs de contenido**: nota corta interna para grabar/diseñar (qué se necesita y para cuándo).
- **Hashtags maestros**: banco reutilizable (`social_hashtag_sets`) con sets por canal y por género.
- **Métricas post-publicación** (`social_post_metrics`): impresiones, alcance, likes, comentarios, guardados, clics — entrada manual.
- **Embajadores/menciones**: enlazar otros perfiles tagueados (productoras, directores).

## 3. Navegación

- Sidebar Marketing → nuevo grupo "Redes sociales": calendario, posts, campañas, plantillas de copy, hashtags.
- Filtros globales por **representado** y por **producción** en cada vista.
- Cada ficha de representado y cada ficha de producción incorpora un panel "Actividad en redes" con sus posts y métricas agregadas.

## 4. Esquema de datos (resumen)

```text
composer_videos          (foto, pero vídeo · cap 12)
social_posts             (post planificable, por canal)
social_post_assets       (N imágenes/vídeos por post)
social_campaigns         (agrupador con objetivo y KPIs)
social_copy_templates    (plantillas con variables)
social_hashtag_sets      (banco de hashtags por canal/género)
social_post_metrics      (1:1 con post tras publicación)
```

RLS: admin escribe todo; lectura para `authenticated`. Compositor lee sólo posts donde `composer_id` = el suyo (vía `can_access_composer`).

Bucket: `marketing-assets` (ya existe) para imágenes/vídeos de los posts.

## 5. UI clave

- **`/marketing/social`**: tabs por canal + filtros (representado, producción, estado, fechas).
- **Editor de post**: dos columnas — izquierda copies por idioma + hashtags + CTA + scheduling; derecha adjuntos (drag & drop), preview tipo mock del canal.
- **`/marketing/social/calendario`**: calendario mensual con códigos por canal.
- **`/marketing/social/campañas`**: tabla con objetivos y KPIs agregados.
- **`/marketing/social/plantillas`**: editor de copies con sustitución de variables.

## Entregable si apruebas

1. Migración: `composer_videos` + 6 tablas `social_*` + RLS + grants.
2. Editor de vídeos en ficha compositor (subida al bucket).
3. Módulo Marketing → Redes sociales: posts, calendario, campañas, plantillas, hashtags.
4. Filtros por representado y producción en todas las vistas.
5. Paneles "Actividad en redes" en fichas de representado y producción.

¿Avanzo con todo el alcance o prefieres acotar a fase 1 (vídeos + posts + calendario) y dejar campañas/plantillas/hashtags/métricas para una segunda iteración?
