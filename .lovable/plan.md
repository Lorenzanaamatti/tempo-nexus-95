# Simplificar las capas de navegación

## Lo que ya no ocurre (verificado en el código)

- **"Equipo IC" duplicado en la barra superior**: hoy en la barra superior solo hay un enlace a `/people`; el botón del extremo derecho ya se eliminó. Lo que sí queda es una duplicación real entre la barra superior y la sidebar: `Calendarios`, `Equipo IC` y `Tareas` existen en ambos sitios.
- **"Nueva tarea · Oportunida…" truncado**: ya no hay entradas por área; la sidebar tiene un único botón **Nueva tarea** que abre el modal con el desplegable de área.
- **Sidebar limitada a TAREAS + ROSTER**: la sidebar sí contiene el árbol completo (Tareas, Clientes, Partners, Oportunidades, Empresa, Legal, Marketing, Calendarios). El problema real es que **todos los grupos están abiertos a la vez**, la lista es muy larga y hay que hacer scroll, así que en pantallas de ~700 px de alto solo se ven los dos primeros grupos y parece que no hay más.

## Cambios propuestos

### 1. Barra superior: quitar la navegación duplicada
La barra superior deja de repetir enlaces que ya están en la sidebar. Se queda con: trigger de la sidebar, logotipo, **migas de pan**, buscador global y campana de tareas. Menos ruido y una sola fuente de verdad para navegar.

### 2. Migas de pan en toda la app
Componente único de breadcrumb en la cabecera, calculado a partir de la ruta actual y del mismo árbol que alimenta la sidebar:

```text
Inicio  ›  Legal  ›  Contratos firmados  ›  Contrato editorial 2024
Inicio  ›  Clientes  ›  Compositores  ›  Nombre del compositor
```

- El último nivel usa el nombre real de la ficha cuando existe (contrato, compositor, producción, cuenta objetivo).
- Cada nivel es clicable, así que desaparece la necesidad de volver al home para orientarse.
- Sustituye a los "← CONTRATOS" sueltos de algunas fichas, que se eliminan para no duplicar el mismo gesto.

### 3. Sidebar contextual: grupos plegables
Cada grupo pasa a ser plegable. Por defecto se abre **solo el grupo que contiene la ruta actual** (y el grupo Tareas, que es fijo); el resto queda plegado. Al entrar directamente en `/contracts` se ve Legal desplegado con el resto de sus secciones, sin scroll. El estado de plegado se recuerda entre sesiones.

### 4. Correspondencia home ↔ sidebar
El home y la sidebar pasan a leer **la misma definición de árbol** (un único módulo compartido de grupos e ítems), de modo que los grupos, los nombres y el orden coincidan siempre. Hoy están duplicados en dos ficheros y se han desincronizado.

### 5. Tabs internas
Se mantienen (Tareas: Asignadas a mí / Creadas por mí; Calendario: Gantt / Calendario / Kanban): son cambios de modo de visualización dentro de una misma pantalla, no navegación. Se unifica su estilo para que se lean claramente como selector de vista y no como un tercer nivel de menú.

## Detalles técnicos

- Nuevo `src/lib/nav-tree.ts` con los grupos, ítems, rutas e iconos; lo consumen `app-sidebar.tsx`, el home (`_authenticated/index.tsx`) y el breadcrumb.
- Nuevo `src/components/breadcrumbs.tsx` sobre `@/components/ui/breadcrumb`, resolviendo el segmento final con el título que ya carga cada ruta de detalle.
- `src/routes/_authenticated.tsx`: se retira el `<nav>` de enlaces y se inserta el breadcrumb.
- `app-sidebar.tsx`: grupos con `Collapsible`, apertura automática por ruta activa y persistencia en `localStorage`.
- Sin cambios de datos, consultas ni permisos: es reorganización de navegación y presentación.

## Pendiente de la petición anterior

Queda sin aplicar la unificación tipográfica de títulos (**mayúsculas completas** en H1 de pantalla y H2 de sección, con utilidad `.title-caps` en `src/styles.css` y respetando nombres propios en fichas de detalle). Se puede ejecutar en el mismo paso que estos cambios.
