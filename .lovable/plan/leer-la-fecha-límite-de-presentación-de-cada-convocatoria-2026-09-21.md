# Leer la fecha límite de presentación de cada convocatoria

## Qué ocurre ahora

Comprobado en los datos actuales: de las 62 convocatorias guardadas, **56 no tienen fecha límite** — son todas las que llegan del canal catalán (CIDO), más 1 del registro nacional (BDNS).

El motivo es que el aviso que envía CIDO (el resumen corto) no incluye el plazo: solo título, organismo y fecha de publicación. La fecha sí está en la página de la convocatoria. Verificado en una de ellas: la ficha muestra "Finalització de presentació de sol·licituds — 05/10/2026", pero la app nunca abre esa página, así que el dato se pierde.

## Qué se hará

1. **Abrir la ficha de cada convocatoria detectada y leer el plazo.** Al capturar, si el aviso no trae fecha límite, la app entra en la página de la convocatoria y busca el plazo por sus etiquetas habituales en catalán y castellano ("Finalització de presentació de sol·licituds", "Termini de presentació", "Fin de plazo de solicitud", "Plazo de presentación... hasta el..."). Si la ficha dice "Termini obert" o no indica fecha, se marca como plazo abierto o sin fecha en lugar de dejarlo vacío sin explicación.
2. **Completar las que ya están guardadas.** Se recorren las 56 convocatorias sin fecha y se les rellena el plazo con el mismo procedimiento, sin tocar el resto de sus datos ni su estado.
3. **Mostrarlo en la Bandeja.** Cada convocatoria mostrará "Cierra el ..." con los días que quedan; cuando no haya podido leerse, se indicará "Plazo no publicado" con enlace directo a la convocatoria, en vez de un guion.
4. **Mejorar también el registro nacional (BDNS).** Cuando la ficha oficial no devuelve el fin de plazo, se leerá del texto de la convocatoria antes de darla por vacía.
5. **Usar la fecha en el análisis.** La puntuación de encaje ya recibe la fecha límite; al existir, la IA podrá descartar las que estén fuera de plazo.

## Después

Se lanzará una revisión real y te diré cuántas convocatorias han recuperado su fecha de cierre y cuántas quedan sin plazo publicado en origen.

## Detalle técnico

- Nuevo módulo `src/lib/ic/subvenciones/plazos.server.ts`: `leerPlazo(url)` descarga el HTML, lo limpia de etiquetas y aplica una lista ordenada de patrones (etiqueta + fecha `dd/mm/aaaa` o `d de mes de aaaa`), devolviendo `{ fecha | "abierto" | null }`. Peticiones secuenciales con timeout y tope por ejecución para no bloquear el cron.
- `captura.server.ts`: en `capturarCido` y `capturarBdns`, antes de `guardar`, se enriquecen los items sin `fecha_limite` con `leerPlazo(source_item_url)`.
- Backfill: función `completarPlazosPendientes(supabaseAdmin, limite)` sobre `subv_oportunidades` con `fecha_limite is null`, expuesta en la ruta de cron existente (`/api/public/subvenciones/capturar`) y en el botón de revisión del panel.
- Sin cambios de esquema; se usa `fecha_limite` y se añade la nota "plazo abierto" en `notas` cuando corresponde.
