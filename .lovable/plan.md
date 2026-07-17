## Cambios

### 1. Ficha de perfil (`composers.$composerId.tsx`)
Envolver los bloques **Estilos musicales**, **Géneros audiovisuales** e **Idiomas** para que solo se rendericen cuando `roster_role === "composer"`. Los demás roles (artista, supervisor, especialista, curador) solo verán **Tags libres**.

### 2. Portada de Especialistas (`composers.index.tsx`, cuando `role === "specialist"`)
- Sustituir los 4 hashtags fijos actuales (`#Técnico`, `#Producción`, `#Cantante`, `#Instrumentista`) por **chips generados dinámicamente a partir de los tags reales** de todas las fichas de especialistas.
- Cada chip muestra el tag y su contador entre paréntesis, p. ej. `Violinista (3)`, ordenados por frecuencia descendente.
- Al pulsar un chip se filtra la cuadrícula a los especialistas que llevan ese tag; segundo clic lo quita. Botón "Limpiar" cuando hay filtro activo.
- Añadir un **modo agrupar por tag**: toggle "Ver agrupado por tag" que reorganiza la cuadrícula en secciones tituladas por cada tag (una persona puede aparecer en varias secciones si tiene varios tags), útil para responder "¿cuántos violinistas tengo?" de un vistazo.
- En cada **tarjeta de especialista**, los tags libres (`tags`) pasan a mostrarse de forma prominente: fila destacada encima del nombre en tipografía mono más visible (no como badges pequeños al pie).

### 3. Alcance limitado
- No se tocan datos ni esquema: `music_styles`, `av_genres`, `composer_styles`, `composer_genres` quedan intactos; simplemente dejan de renderizarse fuera del rol compositor.
- El resto de roles del roster (portadas de Artistas, Supervisores, Curadores) mantienen su vista actual, sin cambios de tags en tarjeta salvo lo ya existente.

### Archivos afectados
- `src/routes/_authenticated/_admin/composers.$composerId.tsx` — condicionar 3 secciones al rol compositor.
- `src/routes/_authenticated/_admin/composers.index.tsx` — reemplazar `SPECIALIST_HASHTAGS` fijo por tags dinámicos con contador, añadir toggle de agrupación, destacar tags en la tarjeta del especialista.
