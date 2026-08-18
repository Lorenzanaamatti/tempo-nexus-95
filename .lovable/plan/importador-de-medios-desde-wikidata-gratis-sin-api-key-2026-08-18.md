# Importador de MEDIOS desde Wikidata (gratis, sin API key)

Fuente elegida: **Wikidata** vía su endpoint SPARQL público. Es la base de datos abierta más completa y gratuita: incluye periódicos, revistas, radios, televisiones y medios digitales de España (y de cualquier país), con web oficial, ciudad, país, fecha de fundación y logo. No requiere clave ni pago.

Lo que NO da Wikidata: emails de redacción y nombres de periodistas. Eso se completa a mano o con una importación CSV posterior.

## Baby steps (lo que verás, paso a paso)

1. **Botón nuevo en PARTNERS · MEDIOS**: "Importar medios (Wikidata)".
2. Al pulsarlo se abre un diálogo con dos filtros simples:
   - País (por defecto España)
   - Tipo de medio: Prensa escrita / Medio digital / Radio / Televisión / Revista especializada (multi-selección, todos marcados por defecto)
3. Pulsas **Buscar**: la app consulta Wikidata y muestra una tabla de resultados con Nombre, Tipo, Ciudad, Web, y una marca "Ya existe" para los que ya están en tu CRM.
4. Seleccionas con casillas los que quieres (hay "seleccionar todos") y pulsas **Importar seleccionados**.
5. Se crean como Partners tipo **Medio**, con subtipo mapeado (Prensa escrita, Medio digital, Radio, Cadena de televisión), ciudad, país, website y ámbito Nacional/Internacional según el país.
6. Nada se duplica: si ya existe un medio con el mismo nombre o la misma web, se actualiza en vez de crear otro.
7. Después puedes editar cada ficha como siempre y añadir contacto, email y notas.

## Segundo paso opcional (mismo diálogo, pestaña 2)

**Importar desde CSV**: pegas o subes un CSV con columnas nombre, web, ciudad, email, contacto, subtipo. Sirve para listados de prensa que consigas por tu cuenta (dosieres, OJD, contactos de gabinetes) y para completar los emails que Wikidata no tiene.

## Detalle técnico

- Nueva server function `src/lib/medios-import.functions.ts`:
  - `searchWikidataMedios({ pais, tipos })`: hace POST a `https://query.wikidata.org/sparql` (formato JSON, User-Agent propio) con una consulta que recoge instancias de periódico (Q11032), revista (Q41298), emisora de radio (Q14350), canal de TV (Q2001305), medio online (Q1153191) filtradas por país, devolviendo etiqueta en español, sede, web oficial y QID.
  - Normaliza a un tipo `MedioCandidato` y marca duplicados comparando contra `partners` (nombre normalizado sin acentos y dominio de la web).
  - `importMedios({ items })`: upsert en `partners` con `tipo = 'Medio'`, guardando el QID en `notas`/campo de referencia para trazabilidad.
- Migración mínima: columna `fuente_externa_id text` en `public.partners` (con índice único parcial) para idempotencia; GRANTs ya existentes en la tabla se mantienen.
- UI nueva: `src/components/medios-import-dialog.tsx` (diálogo con pestañas Wikidata / CSV, tabla con selección) montado en `src/routes/_authenticated/_admin/partners.medios.tsx`.
- Reutiliza estilos y patrones actuales de `partners-view.tsx` (tabla, badges, botón rojo primario) y el parser XLSX/CSV ya presente en el proyecto para la pestaña CSV.
