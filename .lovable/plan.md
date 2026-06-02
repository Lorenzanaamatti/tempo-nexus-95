## Módulo Marketing y Ventas — plan de construcción

Ya tenemos: **Cuentas objetivo** (con creación de oportunidad). Faltan **14 módulos**. Para no entregar 14 páginas a medias, los agrupo en 3 fases por afinidad funcional. Cada fase es independiente, así que podemos pausar/iterar entre fase y fase.

### Estructura común

- Nuevo grupo en sidebar **Marketing y Ventas** (ya creado) con todos los enlaces.
- Las rutas viven en `src/routes/_authenticated/_admin/marketing.*.tsx`.
- Cada módulo: pantalla listado + ficha de detalle.
- Para repositorios documentales reutilizamos el bucket privado existente `composer-assets` con un prefijo `marketing/` (o creamos `marketing-assets` si prefieres separación dura — recomiendo separado).
- Toda la escritura: admin; lectura: cualquier usuario autenticado.

---

### FASE 1 — Repositorios documentales y de contenido (la "base" del módulo)

Son los que más usaréis a diario y comparten el mismo patrón (CRUD + adjunto + tags).

1. **Decks de venta** — tabla `marketing_decks` (titulo, propósito[corto/largo/genérico/por cliente], idioma, versión, audiencia, fecha, archivo, enlace público opcional, notas). Vista lista filtrable por propósito/idioma.
2. **Clipping** — tabla `press_clippings` (medio, titular, autor, fecha, idioma, url, screenshot, compositor relacionado opcional, etiquetas, destacado sí/no). Vista lista con filtros + grid de portadas.
3. **Libro de estilo / Brand** — tabla `brand_guidelines` (sección, contenido richtext, orden, versión) + área de descarga de logos/tipografías. Vista tipo página única con secciones.
4. **Casos de éxito** — tabla `case_studies` (cliente, compositor, problema, propuesta, resultado, métricas, año, assets, visibilidad interna/externa). Vista lista + ficha.
5. **Plantillas de propuesta y email** — tabla `outreach_templates` (tipo[cold/follow-up/propuesta económica/NDA], idioma, asunto, cuerpo markdown, variables disponibles). Vista lista + editor.
6. **Press kits / EPK** — tabla `press_kits` (alcance[compositor/IC global], compositor_id opcional, idioma, versión, archivo, enlace público). Reutiliza compositores existentes.

**Storage:** un único bucket privado `marketing-assets` con subcarpetas por tipo.

---

### FASE 2 — Planificación y eventos

Todo lo que es temporal/calendario.

7. **Calendario de marketing** — tabla `marketing_events` (tipo[publicación/newsletter/evento/campaña], fecha, canal, estado[idea/programado/publicado], responsable, asset_id opcional, notas) + integración con `calendar_events` (subject_type='marketing') para verse en el calendario global existente.
8. **Calendario editorial** — usamos la misma tabla `marketing_events` con tipo `contenido` (tema, formato[blog/entrevista/post], borrador, fecha publicación). Vista separada centrada en pipeline editorial (idea → borrador → revisión → publicado).
9. **Eventos y ferias** — tabla `industry_events` (nombre, ciudad, país, fechas, web, tipo[festival/mercado/congreso], coste estimado, asistentes IC, objetivo, próximas acciones, notas). Vista anual + ficha.

---

### FASE 3 — Distribución, métricas y ecosistema

10. **Newsletter** — tablas `newsletter_issues` (número, fecha, asunto, contenido, segmento, métricas[enviados/abiertos/clics]) + `newsletter_subscribers` (email, nombre, segmentos, alta, baja, fuente). Vista archivo + suscriptores + composición.
11. **KPIs de marketing con analytics** — tabla `marketing_kpi_snapshots` (fecha, canal[IG/LinkedIn/YouTube/web/newsletter], métrica[seguidores/engagement/leads/decks_abiertos/NPS], valor, nota). Vista dashboard con gráficos (Recharts) + carga manual mensual + comparativas.
12. **Activos visuales** — tabla `marketing_visual_assets` (tipo[reel/showreel/foto/vídeo/gif], compositor opcional, archivo o url, miniatura, derechos, etiquetas, fecha). Vista grid con previews.
13. **Colaboraciones / Partners** — tabla `partnerships` (nombre socio, tipo[medio/marca/festival/cross-promo], estado, contacto, contraprestación, fecha inicio/fin, notas, documentos). Vista lista + ficha.
14. **SEO / Web backlog** — tabla `seo_backlog` (tipo[keyword/página/backlink/contenido], título, url destino, prioridad, estado[idea/en progreso/publicado], métrica objetivo, responsable, notas). Vista kanban por estado.

---

### Detalles técnicos (sección para no técnicos puedes saltar)

- Cada tabla: PK uuid, timestamps, `GRANT SELECT ... TO authenticated`, RLS lectura abierta a autenticado + escritura solo admin (mismo patrón que `target_accounts`).
- Constantes y enums en `src/lib/marketing-constants.ts`.
- Sidebar: añadir todos los enlaces dentro del grupo "Marketing y Ventas" creando submenu por fase para no saturar.
- Calendarios reutilizan `calendar_events` cuando aplican, vía triggers que sincronizan desde `marketing_events`.
- KPIs usan `recharts` (ya presente) para los gráficos.

---

### Estimación de migraciones

Fase 1: 1 migración (6 tablas + bucket). Fase 2: 1 migración (2 tablas + sincronización con calendar_events). Fase 3: 1 migración (6 tablas).

---

### ¿Cómo procedemos?

**Opción A (recomendada):** Construyo **Fase 1 ahora** (6 módulos documentales, los más usables y la base del módulo). Cuando confirmes que funciona, sigo con Fase 2 y luego Fase 3. Reduce riesgo y permite ajustar el patrón antes de replicarlo.

**Opción B:** Construyo las 3 fases seguidas en un solo paso. Más rápido pero menos margen para ajustes.

**Opción C:** Reordenamos prioridades — dime qué módulos quieres primero y construyo esos.

¿Vamos con A, B o C?
