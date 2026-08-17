# Unificar la tipografía de títulos: MAYÚSCULAS

Ahora conviven tres convenciones sin criterio: `CONTRATOS` / `PRODUCCIONES EN CURSO` en mayúsculas, y `Roster completo`, `Cuentas objetivo`, `Otros partners`, `Qué hay que hacer` en mixed case. Se adopta **una sola norma: mayúsculas completas** para títulos de pantalla (H1) y subtítulos de sección (H2).

## Regla

- H1 de pantalla y H2 de sección: texto en mayúsculas.
- Se aplica visualmente con una clase de utilidad (`uppercase` + interletraje ligero) en lugar de reescribir cada cadena a mano, para que los títulos dinámicos (nombres de vistas, catálogos, marketing) también queden alineados sin duplicar textos.
- **Excepciones que NO se transforman:** nombres propios de personas y fichas de detalle (compositor, director, contrato, producción, cuenta objetivo), porque son datos, no títulos de sección. También se respetan siglas y hashtags existentes.
- El eyebrow superior (`smallcaps`) y los encabezados de tabla se quedan como están.

## Pantallas afectadas

- Listados: Contratos, Oportunidades, Cuentas objetivo, Candidaturas, Roster completo, Compositores/Artistas/Supervisores/Especialistas/Curadores, Productoras, Plataformas, Directores, Otros partners, CRM Películas ES, Producciones en curso, Deal memos, Tareas ("Qué hay que hacer"), Usuarios y permisos, Facturación, Finanzas.
- Componentes con título parametrizado: `catalog-index.tsx`, `marketing-library.tsx`, `calendar-board.tsx`, `page-header.tsx`.
- Subtítulos H2: Roster actual / En prospección / Objetivo, Interesante Filmografía, secciones de Interesante Compañía, agrupaciones por tier y por hashtag, bloques del portal.

## Detalles técnicos

- Añadir en `src/styles.css` una utilidad `.title-caps` (uppercase + `letter-spacing` corto) sobre la familia display.
- Aplicarla en los H1/H2 de las rutas y componentes listados, y **eliminar** las cadenas que ya están escritas a mano en mayúsculas (`CONTRATOS`, `PRODUCCIONES EN CURSO`) para dejarlas en mixed case en el código: la mayúscula pasa a ser presentación, no contenido. Así el texto sigue siendo legible para búsqueda y accesibilidad.
- No se tocan datos, consultas ni lógica de negocio; el cambio es puramente de presentación.
