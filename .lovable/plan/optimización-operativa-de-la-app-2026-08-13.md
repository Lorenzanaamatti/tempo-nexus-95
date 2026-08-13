# Optimización operativa de la app

Basado en una revisión del código (45 pantallas de administración, ~24.000 líneas) y del uso real de datos en la base (qué tablas tienen contenido y cuáles están vacías).

## Diagnóstico rápido (datos reales)

Con contenido: Películas ES (404), Cuentas objetivo (50), Personas (34), Compositores (24), Producciones (22), Calendario (28), Identidad corporativa (18 archivos).

Prácticamente vacío hoy: Oportunidades (0), Candidatos de oportunidad (0), Proveedores (0), Press kits (0), Casos de estudio (0), Clippings (0), Documentos de producción (0), Sprints de facturación (0), Vídeos (0), Contratos (1), Deal memos (2), Directores (2), Plataformas (2), Candidaturas (1).

Esa asimetría es la guía: el peso de la app está en 6 pantallas, y hay ~15 que solo añaden ruido al menú.

## A. Suprimir o aparcar

1. Ocultar del árbol las secciones sin uso (Proveedores, Press kits, Casos de estudio, Clippings, Vídeos) tras un interruptor de "módulos activos" por espacio de trabajo. No se borra nada: deja de ocupar sitio.
2. Directores y Plataformas: con 2 fichas cada uno, no justifican pantalla propia. Se convierten en pestañas dentro de "Productoras / Entidades".
3. Retirar el catálogo de Documentos genérico (0 filas): ya hay subida de archivos en cada ficha.

## B. Fusionar y concentrar

1. **CRM de entidades unificado**: Productoras, Directores, Plataformas, Proveedores y Cuentas objetivo comparten el 80% de la lógica. Una sola pantalla con filtro por tipo, ya iniciada con el componente de catálogo reutilizable.
2. **Oportunidades + Candidaturas + Deal memos = "Pipeline"**: un único kanban con etapas (Candidatura → Oportunidad → Deal memo → Contrato). Hoy son tres tableros que cuentan la misma historia.
3. **Marketing**: Identidad corporativa, Decks, Press kits, Casos de estudio y Clippings son todos "repositorio de archivos con título, etiquetas y miniaturas". Se reducen a una sola Biblioteca con categorías.
4. **Subidas de archivos**: unificar los distintos subidores (fotos, documentos, decks, candidaturas) en un solo componente con arrastrar-y-soltar, miniatura y progreso.
5. **Fichas gigantes**: compositor (1.201 líneas), películas (1.142), calendario (849), deal memo (843) se dividen en pestañas con carga diferida; hoy cargan todo de golpe.

## C. Añadir (alto valor operativo)

1. **Buscador global** (Cmd+K): personas, películas, cuentas, proyectos, tareas, desde cualquier pantalla.
2. **Inicio accionable**: "qué me toca hoy" — mis tareas vencidas, próximas acciones de mis cuentas, candidaturas sin responder, contratos por firmar.
3. **Notificaciones por email/resumen diario**: altas de usuarios pendientes, tareas asignadas y vencimientos. Hoy todo depende de entrar a mirar.
4. **Historial de actividad por ficha**: quién cambió qué y cuándo, en cuentas, compositores y deal memos.
5. **Recordatorios automáticos**: si una cuenta objetivo lleva X días sin acción, genera una tarea al responsable.
6. **Vistas guardadas y filtros persistentes** en Roster, Películas y Cuentas.
7. **Duplicar ficha** y **acciones en lote** (asignar responsable, cambiar estado, exportar) en las listas.
8. **Plantillas de tareas** por tipo de gestión (nuevo cliente, propuesta, cierre) para no crear pendientes a mano.

## D. Rendimiento

1. Paginación/virtualización en Películas ES (404 filas hoy, crecerá) en vez de traer la tabla entera.
2. Seleccionar solo las columnas necesarias en las consultas de listado (hoy varias hacen `select *`).
3. Carga diferida de gráficos y del módulo de exportación a Excel: son las librerías más pesadas y solo se usan en pantallas concretas.
4. Índices en las columnas por las que más se filtra (responsable, estado, fechas).

## Orden propuesto

1. Limpieza del árbol + ocultar módulos vacíos (impacto inmediato, riesgo nulo).
2. Buscador global + Inicio accionable.
3. Fusión de Marketing en Biblioteca única y CRM de entidades unificado.
4. Pipeline unificado.
5. Rendimiento y notificaciones.

## Nota técnica

Nada de lo anterior borra datos: las fusiones se hacen a nivel de pantalla y ruta, manteniendo las tablas existentes; los módulos "aparcados" siguen accesibles por URL directa.
