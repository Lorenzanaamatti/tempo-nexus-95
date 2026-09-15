# Novedades diarias en OPORTUNIDADES · PRODUCCIONES

## Qué pasa hoy

El alta de oportunidades vive en un único botón "Nueva oportunidad" con dos pestañas dentro: Manual y Desde JSON. El bloque de importación queda escondido dentro de la ficha manual y sólo acepta JSON puro, así que el email diario que recibes (texto con viñetas, emojis, presupuesto en texto, enlace y nota) no se puede pegar tal cual.

## Lo que se construye

### 1. Dos entradas separadas en la cabecera
En la pantalla de Producciones habrá dos botones distintos, igual que en Tareas:

- **Nueva oportunidad** — la ficha manual de siempre, ya sin pestañas.
- **Importar novedades** — panel propio de ingesta múltiple.

### 2. Panel de ingesta múltiple
Un cuadro grande donde pegas el contenido del email del día. Acepta dos formatos y detecta solo cuál es:

- **El email tal cual** (el formato de "🎬 Proyectos España & Europa >5M€"): título, tipo y género entre corchetes, país, presupuesto, estado, productora, director, enlace y nota.
- **JSON** (uno o varios objetos), como hasta ahora.

Al pegar se muestra una previsualización fila a fila: qué se creará, qué se actualizará por coincidir con una oportunidad ya existente y qué se descarta con el motivo. Nada se guarda hasta que confirmas.

### 3. Resultado de la importación
Tras confirmar, se lista cada proyecto con su resultado (creada / actualizada / error). Se mantiene el comportamiento actual:

- Antiduplicados por título + director: si ya existe, se actualiza en vez de duplicar.
- Productora y director se buscan en el CRM; si no existen, se crean con el nombre y quedan listos para completar.
- Se guardan presupuesto (mínimo, máximo y texto original), países, fase, fechas, enlace de la fuente, origen y nota.

### 4. Origen y fecha automáticos
Cada fila importada queda marcada con la fecha de detección del día y el origen indicado en la cabecera del email (p. ej. "Report diario 15/09/2026"), de modo que puedas filtrar las novedades de cada día.

## Detalles técnicos

- Nuevo parser de texto en `src/lib/opportunity-production.ts` (`parseOpportunityReport`) que reconoce el formato de viñetas del email y reutiliza `parseBudgetRange`, `parseCountries` y los mapeos de tipo/género/fase ya existentes; la previsualización usa el mismo tipo `ParsedOpportunity`, así que la escritura sigue pasando por `upsertProductionOpportunity`.
- `src/components/opportunity-intake-dialog.tsx` se divide en dos componentes: la ficha manual y un nuevo `OpportunityImportDialog` con textarea, detección de formato, previsualización y resumen.
- `src/components/opportunities-list.tsx` renderiza ambos botones cuando `productionMode` está activo.
- Opcional, si lo quieres después: un endpoint público (`/api/public/opportunities/report`) protegido por clave para que el email llegue solo sin pegarlo a mano. No entra en esta fase salvo que lo pidas.
