# OPORTUNIDADES · PRODUCCIONES — ficha completa e ingesta por JSON

## Qué pasa hoy

La pantalla existe y sí guarda (hay 4 oportunidades grabadas, dos de hoy), pero el formulario es una fila mínima: título, tipo, productora, responsable y fecha. No hay sitio para presupuesto, país, fase, director, fuente ni notas, así que un proyecto del report de Vanessa no cabe y la ficha no se puede consultar con detalle. Tampoco hay forma de pegar un JSON.

## Lo que se construye

### 1. Ampliar la ficha de oportunidad
Se añaden a la oportunidad los campos del modelo acordado:

- Identificación: título, título alternativo.
- Clasificación: tipo (película / serie / documental / animación / otro), género (ficción / animación / no ficción), países (varios, con marca automática de coproducción).
- Económico: presupuesto mínimo, máximo, texto original ("est. €20M+") y financiación pública.
- Estado: fase (desarrollo / preproducción / rodaje / postproducción / finalizado / estreno), fecha de rodaje, fecha de estreno.
- Actores: productora, AIE, director, reparto.
- Trazabilidad: URL fuente, fecha de detección, origen, nota.
- Gestión IC (lo que ya existe): estado, prioridad, responsable, valor estimado, probabilidad, candidatos del roster, próxima acción.

### 2. Dos formas de dar de alta
- **Manual**: formulario completo en un panel lateral, agrupado por los bloques de arriba.
- **Por JSON**: se pega un objeto o una lista de objetos, se muestra una previsualización fila a fila (qué se creará, qué se actualizará, qué se descarta) y se confirma. Se acepta el vocabulario del report ("película ficción", "6-8M", "20M+", "España/Francia") traduciéndolo a los campos.
- **Antiduplicados**: la clave es título normalizado + director. Si el proyecto ya existe, la ficha se actualiza en vez de crear una entrada nueva, y se guarda nota del cambio.

### 3. Lista y ficha de consulta
- Lista con búsqueda y filtros por fase, tipo/género, país, productora, estado IC y responsable; orden por presupuesto, fecha de detección o cierre; exportable a Excel como el resto.
- Al hacer clic se abre la ficha completa con todos los bloques, editable, con su historial de acciones, sus candidatos del roster y botones explícitos de Guardar y Eliminar.

### 4. Productoras y directores contra el CRM
- Los campos Productora y Director son buscadores sobre el CRM de Productoras y el de Directores.
- Si no existe, se crea desde el mismo campo ("Crear 'X'") con solo el nombre; la ficha queda en el CRM lista para completar después.
- La oportunidad queda enlazada a la ficha del CRM, no a un texto suelto.

### 5. Tareas, calendario y seguimiento del representado
- Las acciones con fecha de una oportunidad ya generan tarea y evento; se mantiene ese mismo circuito para las oportunidades de producción, con responsable asignado.
- Al añadir un representado como candidato, la oportunidad aparece en su ficha (bloque de propuestas) y en su portal, con fase y estado actualizados automáticamente.
- Desde la ficha de la oportunidad se ve el hilo completo: acciones, tareas pendientes, representados presentados y fechas clave.

## Detalles técnicos

- Nuevas columnas y enums sobre `public.opportunities` (no se crea tabla paralela) para reaprovechar `opportunity_candidates`, `opportunity_actions` y los disparadores de calendario/tareas ya existentes; migración con GRANTs y políticas RLS iguales a las actuales.
- Índice único funcional sobre `lower(unaccent(title)) + director_id/director_text` para la deduplicación; la importación JSON hace upsert sobre esa clave.
- Parseo del JSON en una función de servidor con validación Zod, normalización de presupuestos en rango y devolución de un informe (creadas / actualizadas / rechazadas) antes de confirmar.
- `src/components/opportunities-list.tsx` se divide en lista + panel de alta; la ficha vive en `opportunities.$opportunityId.tsx` ampliada.
- Selector reutilizable de entidad CRM con creación al vuelo, usado para productora y director.
