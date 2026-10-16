# Gantt por película: un color por proyecto, una fila por fase

## Qué cambia para la usuaria

```text
EL REINO (verde salvia)
  Visuales entregados    [======]
  Composición                   [==============]
  Aprobación                                   [==]
  Grabación                                       [=====]
  Entrega                                               (●)
ROSA (terracota)
  Composición        [==========]
  Mezclas                       [====]
  ...
```

- Cada película tiene **su propio color**, elegido de una **paleta fija de 25 tonos**.
- Debajo del título de la película aparecen todas sus fases, **una fila por fase**, ordenadas por fecha de inicio, cada una en su fecha.
- Todas las franjas de una película llevan **el mismo color**, y el **nombre de la fase va escrito sobre la franja** (Composición, Entrega de visuales…). Si la franja es muy corta, el nombre sigue legible justo al lado.
- Los hitos de un día se pintan en el mismo color con el círculo blanco, como ahora.
- Debajo de cada película va la siguiente, con el mismo formato. Ya no habrá la línea única por producción ni los colores por tipo de fase.

## Cómo se elige el color

- En la cabecera de cada película dentro del Gantt: un pequeño cuadro de color; al pulsarlo se abre la paleta de 25 tonos y se cambia al momento.
- El mismo selector aparece en la ficha de la producción.
- Las películas que aún no tengan color reciben uno automático de la paleta (estable, sin repetir mientras sea posible) hasta que la usuaria lo cambie. No se borra ni modifica ningún dato existente.

## Dónde se ve

Gantt de producciones, Gantt de procesos del calendario general y Gantt dentro de la ficha del compositor/producción (todos usan el mismo componente). Los filtros por compositor, producción y responsable se mantienen. Se retiran los botones «Desplegado / Lineal», ya que el nuevo formato sustituye a ambos.

## Detalles técnicos

- Migración aditiva: columna `productions.gantt_color text NULL` (clave de la paleta), sin tocar datos.
- Nuevo `src/lib/project-palette.ts`: 25 claves con nombre y color (definidos como tokens en `styles.css`, legibles con texto encima, coherentes con aubergine/rust/avocado) y `fallbackColor(productionId)` por hash.
- Componente `ProjectColorPicker` (popover con cuadrícula 5×5) que guarda en `productions.gantt_color` e invalida las consultas del Gantt.
- `production-gantt-panel.tsx`: leer `gantt_color` y pasarlo por fila.
- `production-gantt.tsx`: nuevo render agrupado por producción → fases ordenadas por inicio, barra con etiqueta interna (`truncate`, con fallback exterior si el ancho es pequeño); leyenda pasa a ser lista de películas con su color.
- Selector también en `producciones.$productionId.tsx`.
- Registrar en `AGENTS.md`: el color del Gantt es propiedad de la producción, no de la fase.
