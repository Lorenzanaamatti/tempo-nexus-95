# Reestructura de portada, navegación y color

Solo diseño y navegación. No se tocan permisos, lógica de negocio ni el portal del representado.

## 1. Paleta

Tres colores Pantone sobre fondo blanco, sin modo oscuro.

| Uso | Pantone | Hex |
| --- | --- | --- |
| Botones principales y llamadas a la acción (texto blanco) | 19-3715 TCX Aubergine Gleam | morado berenjena profundo — resuelvo el hex exacto de la carta Pantone al implementar y lo dejo en un único token |
| Títulos de sección, separadores y líneas de fichas | 18-1248 TCX Rust | #B55A30 |
| Tarjetas, paneles, bandas y apoyos | 16-0640 TCX Avocado Oil | #9B892F (en versiones suaves para fondos, para que el texto siga legible) |

- Botones secundarios en gris neutro.
- Colores por área y gráficas se rearmonizan a esta familia (aubergine, rust, avocado y sus tonos).
- Se retira el modo oscuro: desaparece el selector de tema y la app queda siempre en claro.
- El fondo se mantiene en el blanco frío actual #F9FEFF.
- Nota: el logotipo actual es negro con punto rojo; el aubergine se aplica como color corporativo aunque el logo no lo lleve todavía.

## 2. Pantalla de bienvenida

Nueva portada a pantalla completa, sin menú lateral:

- Logo de Interesante centrado arriba y, debajo, el rótulo de la herramienta.
- Saludo "Hola, NOMBRE" con el nombre de la persona.
- Selector de vista: Dirección (BIG C) puede cambiar entre todas las vistas; Team solo ve indicada su vista, sin opciones que no le correspondan.
- **Cómo tienes el día**: dos puertas grandes en parrilla — Tareas y Calendario.
- **En qué vas a trabajar**: puertas grandes en parrilla con las secciones reales activas.
- **Recursos**: Templates, Calendario general, Tutoriales, BI, Agentes IA (solo Dirección), Auditoría (solo Dirección).
- **Departamentos**: Financiero, Facturas, Personal, CRM (solo Dirección) y Marketing (todos).
- Botones blancos con texto Rust; al pulsar o quedar activos, aubergine con texto blanco. Sin datos ni cifras en esta pantalla.
- Tutoriales y BI aún no existen como sección: se crean como páginas vacías con su título y un texto de "en preparación", listas para llenarse.

## 3. Navegación contextual

- El árbol lateral solo aparece dentro de una sección, nunca en la portada.
- Dentro de una sección se sigue viendo el resto de secciones en el árbol.
- Títulos de grupo en negrita, mayores que los enlaces, en Rust.
- Enlace "Volver a bienvenida" con icono de casa arriba a la derecha, en flujo normal (se desplaza con el contenido, no tapa botones).
- Repaso del árbol para que todos los enlaces apunten a secciones vivas; los que ya no existan se eliminan.

## 4. Puertas dentro de cada sección

Cuando una sección tiene varias opciones de trabajo:

- Parrilla de botones grandes centrados (3 columnas en pantalla ancha), no una barra de pestañas.
- Cada botón: título en negrita y una línea describiendo el trabajo. Nada más.
- Blancos con texto Rust; el elegido en aubergine con texto blanco.
- Al entrar en una opción desaparecen las demás y queda solo **ATRÁS**; la parrilla es algo menor que la pantalla para que ATRÁS y "Volver a bienvenida" no se solapen.
- Dentro del espacio de trabajo: limpio, centrado, sin scroll constante.

## Detalles técnicos

- Tokens de color en `src/styles.css`: se reescriben `--primary`, `--ring`, `--accent`, `--border`, `--chart-*` y los tokens de sidebar/portal a la familia aubergine/rust/avocado; se elimina el bloque `.dark`, el script anti-flash de `__root.tsx` y `ThemeToggle`.
- Nueva portada en `src/routes/_authenticated/index.tsx`, con el selector de vista de `/vista` integrado (`session-view.ts` se mantiene).
- `src/routes/_authenticated.tsx`: el shell deja de renderizar `AppSidebar` en la portada y añade la cabecera con "Volver a bienvenida".
- `src/lib/nav-tree.ts`: se añaden los grupos Recursos y Departamentos, se depuran enlaces muertos y se marcan los ítems restringidos a Dirección.
- Nuevo componente reutilizable de "puertas" (`section-doors.tsx`) usado en la portada y en las secciones con varias opciones; las páginas con pestañas pasan a usarlo.
- Rutas nuevas vacías: Tutoriales y BI.
- Sin migraciones ni cambios de permisos.
