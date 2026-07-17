# Nuevas tipografías de la app

Sustituir las fuentes actuales (Cormorant Garamond, Inter Tight, JetBrains Mono) por el sistema tipográfico oficial:

- **Bricolage Grotesque** — 800 para títulos principales, 400 para subtítulos.
- **Space Mono** — 700 para títulos de tercer rango, 400 para texto de apoyo.
- **Space Grotesk** — chat y notificaciones (interacciones directas).

## Cambios

1. **`src/routes/__root.tsx`** — reemplazar el `<link>` a Google Fonts por uno que cargue las tres familias con los pesos indicados:
   - `Bricolage+Grotesque:wght@400;800`
   - `Space+Mono:wght@400;700`
   - `Space+Grotesk:wght@400;500;600;700`

2. **`src/styles.css`** — actualizar tokens en `@theme`:
   - `--font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;` (títulos grandes, peso 800)
   - `--font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;` (UI, chat, notificaciones — texto base de la app)
   - `--font-mono: "Space Mono", ui-monospace, monospace;` (títulos rango 3 en 700, texto de apoyo mono en 400)
   - Añadir `--font-body` opcional si conviene separar body de chat; por defecto todo el body usará Space Grotesk.

3. **Jerarquía en `@layer base`** de `src/styles.css`:
   - `h1, h2` → `font-family: var(--font-display); font-weight: 800;` (Bricolage 800)
   - `h3` (subtítulos/subsecciones) → `font-family: var(--font-display); font-weight: 400;` (Bricolage 400)
   - `h4` (tercer rango) → `font-family: var(--font-mono); font-weight: 700;` (Space Mono 700)
   - `.font-display` sigue apuntando a Bricolage.
   - Añadir utilidad `.font-chat` mapeada a Space Grotesk para uso explícito en el chat y toasts si algún componente lo necesita (el default ya es Space Grotesk, así que es opcional).

4. **No tocar componentes**: los estilos actuales usan `font-display`, `font-sans` y `font-mono` como tokens, así que el cambio se propaga automáticamente. Revisar rápidamente `ComposerChat` y `Toaster` para confirmar que heredan `--font-sans` (Space Grotesk) sin overrides.

## Notas

- Se mantiene el mismo mecanismo de carga (link en `__root.tsx`, no `@import` en CSS) para evitar romper el build de Lightning CSS.
- Los pesos cargados cubren exactamente los usos pedidos; se puede ampliar más adelante si aparecen necesidades (p. ej. Space Grotesk 500 para énfasis medio en chat).
- No se cambia ningún token de color ni layout — solo tipografía.
