# La ficha completa debe viajar al pitch

## Por qué pasa

Una oportunidad de producción guarda 40 datos (título alternativo, tipo, género, países, coproducción, presupuesto mínimo/máximo y texto original, financiación pública, fase, fecha de rodaje, fecha de estreno, AIE, director, reparto, fuente, origen del report, prioridad, fecha de detección, probabilidad, estados…).

La ficha de pitch solo tiene 15 campos: título, partner destinatario, proyecto vinculado, producción, tipo, fecha de pitch, estado, presupuesto estimado, fecha de seguimiento, responsable y notas.

Al trasladar, solo se copian los datos que caben en esos 15 campos. El resto se queda en la oportunidad, que ahora está archivada, y en la página del pitch aparece encogido dentro de un recuadro gris de solo lectura llamado "Datos de la producción de origen". De ahí la sensación de ficha troceada y con mucha menos información.

## Qué haremos

El pitch pasa a mostrar **la ficha íntegra del proyecto**, con los mismos bloques y el mismo nivel de detalle que en Oportunidades, y además los campos propios del pitch.

Estructura de la página de pitch:

1. **Proyecto** (todos los datos que hoy se pierden o se encogen): título, título alternativo, tipo y género de producción, fase, países y coproducción, presupuesto (mínimo, máximo y texto original), financiación pública, fechas de rodaje y estreno, productora y AIE, director, reparto, fuente, origen y fecha de detección, prioridad. Editables, no de solo lectura.
2. **Pitch**: estado, tipo, fecha del pitch, fecha de seguimiento, presupuesto estimado, representados vinculados, ejecutiva responsable.
3. **Notas y seguimiento**: notas de la oportunidad y notas del pitch en un solo bloque.

Se elimina el recuadro "Datos de la producción de origen": deja de tener sentido cuando todo está en la propia ficha.

Al trasladar desde Oportunidades no cambia nada de lo ya acordado: la ficha pasa tal cual, sin pedir datos, y la oportunidad desaparece del listado activo.

## Detalle técnico

- El proyecto sigue viviendo en una sola fila de `opportunities` (fuente única de verdad); `oportunidades_pitches` guarda únicamente lo propio del pitch y mantiene `oportunidad_id`. Así no se duplican datos ni quedan dos versiones que se desincronizan.
- `oportunidades.pitches_.$pitchId.tsx`: sustituir el bloque readonly de origen por un formulario completo de la oportunidad, reutilizando los mismos campos y etiquetas que usa la ficha de oportunidad (`OPP_TYPE_LABEL`, `OPP_PHASE_LABEL`, géneros, prioridad, países, reparto). Guardar hace dos updates: uno a `opportunities` y otro a `oportunidades_pitches`, con un único botón Guardar.
- Pitches creados sin `oportunidad_id` (alta manual en Pitches): se muestran solo los bloques 2 y 3, sin campos de proyecto vacíos.
- El enlace "Ver oportunidad" se mantiene como acceso secundario a la oportunidad archivada.
- Sin cambios de base de datos ni migraciones.
