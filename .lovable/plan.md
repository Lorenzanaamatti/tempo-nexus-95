# Nuevo buscador de MEDIOS: web en vivo (Firecrawl) en lugar de Wikidata

Wikidata queda descartada: catálogo desactualizado, medios cerrados que siguen apareciendo y sin forma de filtrar por especialización cultural (cine, música, BSO). La sustituimos por una búsqueda en la web real, en vivo, con verificación de que el medio existe hoy.

## Qué verás en PARTNERS · MEDIOS

1. Botón **Buscar medios** (sustituye a "Importar medios (Wikidata)").
2. Diálogo con tres filtros claros:
   - **Ámbito**: España / Internacional / Ambos
   - **Especialidad**: Generalista · Cultura · Cine · Música · Series/TV · Industria audiovisual
   - **Formato**: Prensa escrita · Revista · Medio digital · Radio · Televisión · Podcast
3. Pulsas **Buscar**: la app lanza búsquedas en la web con esos criterios y devuelve medios reales, con Nombre, Web, Formato, Especialidad, Ámbito, y una descripción de una línea.
4. Cada resultado se comprueba en vivo: si la web no responde, se marca **No verificado** y no se selecciona por defecto. Así no entran medios cerrados.
5. Marca **Ya existe** para los que ya están en tu CRM (por nombre o dominio).
6. Seleccionas y pulsas **Importar seleccionados**: se crean/actualizan como Partners tipo **Medio**, sin duplicar.
7. Pestaña **CSV** se mantiene para tus listados propios y para completar emails de redacción.

Cobertura inicial pensada para España (generalistas, autonómicos, culturales, cine y música) y los internacionales clave del sector (Variety, Hollywood Reporter, Screen Daily, Deadline, Billboard, Film Music Reporter, IndieWire, etc.), pero sin lista cerrada: al ser búsqueda en vivo, aparecen también los medios nuevos.

## Requisito

Necesito conectar **Firecrawl** (buscador/lector web). Te abriré la tarjeta de conexión en el chat; es un clic. Sin esa conexión no hay fuente en vivo.

## Detalle técnico

- Conectar el conector **Firecrawl** y leer `uses_connector_gateway` para elegir modo directo o gateway.
- Reescribir `src/lib/medios-import.server.ts`:
  - Eliminar `queryWikidata`, QIDs y el mapa de países.
  - Nuevo `searchMedios({ ambito, especialidades, formatos, limit })`: compone varias consultas (`POST /v2/search`, `limit` por consulta, `country`/`lang` según ámbito), deduplica por dominio, y clasifica cada resultado en formato + especialidad con el AI Gateway (`google/gemini-2.5-flash`) devolviendo JSON estricto validado con Zod.
  - `verifyMedios(urls)`: `HEAD`/`GET` con timeout corto y concurrencia limitada para marcar `verificado`.
  - Se mantienen `normalize`, `domainOf`, `importInput` y toda la lógica de upsert.
- `src/lib/medios-import.functions.ts`: `searchWikidataMedios` → `searchMedios` (mismo patrón: `requireSupabaseAuth` + `requireAdmin`, cruce contra `partners` para marcar `existe`). `importMedios` se conserva y guarda `fuente_externa_id = 'web:<dominio>'`.
- `src/components/medios-import-dialog.tsx`: pestaña Wikidata → **Buscar en la web** con los tres filtros, columnas Nombre / Formato / Especialidad / Ámbito / Web / Estado (Nuevo · Ya existe · No verificado). Pestaña CSV sin cambios.
- `src/lib/medios-model.ts`: nuevos catálogos `MEDIO_FORMATOS` y `MEDIO_ESPECIALIDADES`; se retira `MEDIO_TIPOS` de Wikidata. Los subtipos guardados siguen siendo los de `PARTNER_SUBTIPOS.Medio`.
- Sin migración: `fuente_externa_id` ya existe en `partners`.
