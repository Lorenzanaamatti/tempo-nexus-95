# Fechas del roster: sustituir el guión por "Pendiente"

En ROSTER ACTUAL, 20 de 22 fichas no tienen fecha de contratación ni de vencimiento. Hoy ambas celdas muestran "–", que se lee igual que un dato vacío legítimo. Como todos esos vacíos son datos por completar, la tabla debe decirlo y ofrecer la vía para rellenarlo.

## Qué cambia en pantalla

**Celdas de CONTRATACIÓN y VENCIMIENTO (roster actual)**
- Con dato: igual que ahora (año de contratación / fecha de vencimiento).
- Sin dato: en lugar de "–", una etiqueta discreta **PENDIENTE** en versalitas, atenuada y con borde punteado, enlazada a la ficha del representado para completar la fecha.
- Sin avisos de caducidad ni colores de alerta: la fecha se muestra tal cual.

**Celdas de PRÓXIMA ACCIÓN y OBJETIVO CONTRATACIÓN (roster en prospección)**
- Mismo tratamiento: **PENDIENTE** enlazado en lugar de "–", para que la lectura sea coherente en toda la pantalla.

**Cabecera de cada sección**
- Junto al contador de fichas, un contador secundario tipo `20 sin fechas` cuando haya registros incompletos, para ver de un vistazo cuánto queda por completar.
- Filtro rápido en la cabecera de la pantalla: **SOLO INCOMPLETAS**, que deja en la tabla únicamente las fichas a las que falta alguna fecha. Se combina con el buscador existente.

**Ayuda contextual**
- Nota breve bajo el título explicando que "Pendiente" significa dato por completar en la ficha del representado, no ausencia de contrato.

## Detalles técnicos

- Cambios solo en `src/routes/_authenticated/_admin/roster.tsx`: componente `DateCell` (valor formateado o etiqueta `Pendiente` como `Link` a `/composers/$composerId`), contador por sección y toggle de filtro.
- El filtro "Solo incompletas" es estado local de la pantalla, alineado con el patrón de "Mis tareas".
- Sin migraciones ni cambios de datos: no se añade ningún estado "no aplica".