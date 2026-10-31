# CRM de producciones en desarrollo: acciones claras, fecha de entrada y productoras separadas

## Lo que hay hoy
- Ya existen «Eliminar» y «Pasar a Pitches», pero solo como iconos pequeños sin texto al final de la fila: no se reconocen.
- No hay opción «Mantener» ni se ve la fecha en que entró cada proyecto (solo «fecha detectada», que a menudo está vacía).
- Productoras: al importar, el texto «Wanda Visión, Gravier Productions, 3Six9 Studios» se guardó como UNA sola productora. Hay 51 fichas así (separadas por comas, «/», «+», «;» o «y»). Por eso «Añadir al CRM de productoras» crea fichas falsas.

## Qué haremos
1. **Menú de acciones visible en cada fila** (botón «Acciones» con texto):
   - **Mantener** — confirma que sigue en seguimiento y anota la fecha de esa revisión.
   - **Bajar a Pitches en curso** — el traslado actual (crea el pitch y archiva la oportunidad).
   - **Eliminar** — con confirmación.
   También dentro de la ficha al abrirla.
2. **Fecha de entrada**: nueva columna «Entrada» (fecha en que se dio de alta en la app, dd/mm/aaaa), ordenable, y visible en la ficha. Los proyectos existentes conservan su fecha real de alta.
3. **Productoras individuales**:
   - Cada proyecto puede tener varias productoras; en la fila aparecen como etiquetas separadas, cada una con su propio menú «Añadir a Partners / Productoras a contactar / Cuentas objetivo».
   - Las 51 fichas combinadas se separan en productoras individuales (reutilizando las que ya existen con el mismo nombre). La plataforma entre paréntesis («(Netflix)», «(Prime Video)») se guarda como plataforma, no como productora. Las notas tipo «(The Tourist, Fleabag)» se quitan del nombre.
   - Las fichas combinadas antiguas no se borran: quedan marcadas como obsoletas y dejan de mostrarse en selectores.
   - La importación por JSON/texto y el alta manual separan automáticamente las productoras a partir de ahora.
   - Antes de aplicar la separación te mostraré la lista resultante de las 51 para que la revises.

## Detalles técnicos
- Nueva tabla `opportunity_partner_companies` (opportunity_id, company_id, is_primary, unique), con GRANT + RLS como `opportunities`; `opportunities.partner_company_id` sigue siendo la principal (patrón de `production_partner_companies`).
- `opportunities.kept_at timestamptz` para «Mantener»; columna «Entrada» desde `created_at`.
- Función `splitCompanyNames()` en `src/lib/` (separadores `,` `/` `+` `;` ` y ` ` & `, extrae paréntesis) con tests; usada en `opportunity-import-dialog.tsx`, alta manual y backfill.
- Backfill aditivo: crear/reutilizar `production_companies` por nombre normalizado, enlazar, y `COMMENT`/marca obsoleta en las combinadas; ningún DELETE.
- UI en `opportunities-list.tsx` y el diálogo de la ficha; `ProductoraActionsMenu` por cada productora.
