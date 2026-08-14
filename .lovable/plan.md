# Propuestas de optimización (solo análisis, sin cambios)

Lista priorizada de mejoras detectadas al revisar la app. Nada se implementa hasta que elijas.

## A. Rendimiento percibido (impacto alto, riesgo bajo)

1. **Caché de datos mal configurada.** El cliente de datos se crea sin tiempos de caché: cada vez que vuelves a una pantalla se recarga todo desde cero. Fijar 30-60 s de "frescura" y desactivar la recarga al enfocar la ventana elimina la mayoría de parpadeos y llamadas repetidas.
2. **Favicon de 785 KB.** Se descarga en cada visita. Debería pesar <20 KB (versión 64x64 optimizada).
3. **Librería de Excel cargada siempre.** La exportación a hoja de cálculo (~400 KB) entra en el paquete inicial aunque no exportes nada. Cargarla solo al pulsar "Exportar".
4. **Consultas que piden todas las columnas.** Pantallas como compositores, redes sociales, deal memos y marketing traen columnas que no muestran (textos largos, notas). Pedir solo lo que se pinta acelera listados grandes.
5. **Sin paginación real** en listados que crecerán (CRM Películas ES, Identidad corporativa, Candidaturas, Roster). Conviene paginar o cargar por scroll a partir de ~100 fichas.
6. **Sondeos cada 30 s** en barra lateral y campana de avisos. Se pueden unificar en una sola consulta de contadores o pasar a tiempo real.

## B. Mantenibilidad del código

7. **Pantallas gigantes.** Ficha de compositor (1.200 líneas), CRM Películas (1.140), Calendario (850), Deal memo (840). Dividirlas en pestañas/bloques reduce errores y tiempos de carga por ruta.
8. **Tipos de base de datos desactualizados.** Hay ~150 puntos donde el código "apaga" el tipado para poder consultar tablas nuevas. Regenerar los tipos devuelve autocompletado y detección de errores antes de publicar.
9. **Subida de archivos duplicada 6 veces** (fotos, vídeos, candidaturas, marketing, plantillas). Un único componente de subida con arrastrar-y-soltar unificaría comportamiento y mensajes de error.
10. **Editores de fichas repetidos.** Filmografía, premios, demos, fases, contrapartes… comparten estructura; ya existe un editor genérico (`RelationListEditor`) infrautilizado.
11. **Fase 3 pendiente de la simplificación anterior:** unificar las herramientas del chat interno y las de los agentes externos en un único catálogo.

## C. Experiencia de uso

12. **Estados de carga inconsistentes:** unas pantallas muestran esqueleto, otras se quedan en blanco. Unificar carga, vacío y error.
13. **Búsqueda global ausente.** Un buscador único (roster, cuentas, películas, deal memos) ahorraría muchos clics en el árbol.
14. **Filtros que no se recuerdan** al volver atrás en Roster, Cuentas objetivo y Candidaturas.
15. **Ediciones sin confirmación visual** en varios formularios (se guarda al salir del campo sin aviso claro).
16. **Uso en móvil:** las vistas Kanban y calendario no están adaptadas a pantalla pequeña.

## D. Datos y seguridad

17. **Índices de base de datos**: revisar los campos por los que se filtra y ordena a diario (responsable, estado, fechas) para que los listados no se degraden al crecer.
18. **Duplicados de personas y empresas**: no hay control de nombres repetidos al crear desde CRM Películas; conviene detección de duplicados al escribir.
19. **Auditoría de cambios**: hoy no queda registro de quién modificó qué en fichas críticas (deal memos, contratos).

## Estado

- Bloque 1: hecho (caché, favicon, Excel bajo demanda, sondeos).
- Bloque 2: hecho (paginación y orden en servidor con métricas de latencia, índices de base de datos, columnas reducidas en catálogos).
- Bloque 3: en curso — subidas de archivos unificadas en toda la app (`FileDropzone` + `src/lib/storage-upload.ts`): fotos de personas y compositores, vídeos, marketing, candidaturas y plantillas de deal memo. Catálogo único de herramientas chat + agentes externos hecho (`src/lib/tool-catalog.ts`). Pendiente: dividir pantallas grandes, regenerar tipos y reutilizar el editor genérico de fichas.

## Orden recomendado

Bloque 1 (rápido, se nota enseguida): 1, 2, 3, 4, 12.
Bloque 2 (escalabilidad): 5, 6, 17, 8.
Bloque 3 (limpieza): 7, 9, 10, 11.
Bloque 4 (producto): 13, 14, 15, 16, 18, 19.

## Detalle técnico

- QueryClient en `src/router.tsx` sin `defaultOptions` → añadir `staleTime`, `gcTime`, `refetchOnWindowFocus: false`.
- `src/components/export-button.tsx` importa `xlsx` estáticamente → `await import("xlsx")` dentro del handler.
- `select("*")` en 20 archivos; `supabase as any` en ~40 archivos → regenerar `src/integrations/supabase/types.ts`.
- Subidas: `photo-uploader`, `video-gallery`, `person-photo-uploader`, `marketing-upload`, candidaturas y plantillas DM → un `FileDropzone` + hook `useStorageUpload`.
- Rutas admin: 45 archivos en `_admin`; los mayores se benefician de división en subcomponentes por pestaña.
