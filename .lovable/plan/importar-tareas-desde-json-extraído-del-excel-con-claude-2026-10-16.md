# Importar tareas desde JSON (extraído del Excel con Claude)

## Qué tendrás
1. **Nueva pantalla «Importar tareas»** dentro de TAREAS, visible solo para claudia@juny.tv, claudia@fronterah.com y todas las cuentas de Lourdes Hernández (las que estén vinculadas a su ficha).
   - Un cuadro grande para pegar el JSON.
   - Botón «Revisar»: muestra una tabla previa con cada tarea, su responsable, fecha, urgencia y categoría, y marca errores (fecha ilegible, falta el texto de la tarea…).
   - Detecta posibles duplicados (mismo título y misma persona/cliente ya existente) y por defecto los omite; se pueden marcar para crearlos igualmente.
   - Casilla por fila para incluir/excluir. Botón «Importar N tareas».
   - Al terminar: resumen de creadas, omitidas y rechazadas, y las tareas aparecen al instante en «Mis tareas» de quien importa.
2. **Instrucciones para Claude** visibles en la misma pantalla con botón «Copiar instrucciones», también descargables. Indican:
   - Leer por defecto la pestaña **NUEVAS**, salvo que se le pida otra.
   - Una tarea por fila; ignorar filas vacías y la de cabeceras.
   - Formato exacto del JSON y cómo traducir cada columna.

## Cómo se traduce cada columna del Excel
| Excel | En la tarea |
|---|---|
| Tarea para mí | Título |
| Persona, Cliente, Asunto | Se guardan en las notas («Persona: … · Cliente: … · Asunto: …») y el asunto se antepone al título si aporta contexto |
| Fecha | Fecha de entrega (dd/mm/aaaa → fecha). Textos como «desde 20/10/2026» o «(caduca)» se conservan en notas y se usa la fecha que aparece |
| Urgencia | 1 Urgente → fecha límite viernes de esa semana si no hay fecha; se guarda como prioridad en notas y etiqueta visible |
| Categoría | Se guarda como subárea; el área por defecto será la que elija quien importa en la pantalla (p. ej. Producción / Comercial) |
| Origen | Se añade a las notas |
| Nº | Referencia en notas, sirve para detectar duplicados |

Responsable: por defecto, la persona que importa (son «tareas para mí»). Se puede cambiar el responsable para todo el lote antes de importar.

## No se borra nada
Solo se crean tareas nuevas; nunca se modifican ni eliminan las existentes.

## Detalles técnicos
- Ruta `/_authenticated/_admin/tareas_.importar.tsx`; enlace en el árbol de TAREAS solo para los emails autorizados.
- Permiso comprobado en servidor: `createServerFn` con `requireSupabaseAuth` que verifica el email del llamante contra la lista (claudia@juny.tv, claudia@fronterah.com y los emails de usuarios vinculados a la ficha `people` de Lourdes) e inserta en `actions` con el cliente del usuario (RLS staff ya permite insertar).
- Validación Zod del JSON: `{ "tareas": [{ "n", "persona", "cliente", "asunto", "tarea", "fecha" (YYYY-MM-DD|null), "fecha_texto", "categoria", "urgencia" (1-4), "origen" }] }`.
- Inserción por lotes, `.select("id")` para confirmar filas guardadas, invalidación de las listas de tareas.
- Test unitario de la conversión urgencia→fecha y del parseo de fechas.
