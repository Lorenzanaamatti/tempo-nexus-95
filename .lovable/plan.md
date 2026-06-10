## Portal del representado — Editorial · grid hairline

Aplicar la dirección visual aprobada (sobria, editorial, acentos coral) al portal y añadir el logo de Interesante Compañía al sidebar admin y a la cabecera del portal.

### 1. Asset del logo
- Subir el logotipo proporcionado vía `lovable-assets` y guardar el puntero en `src/assets/interesante-compania-logo.png.asset.json`.

### 2. Tokens y utilidades (`src/styles.css`)
- Añadir `--accent-coral` (oklch ~0.62 0.16 30) y tokens noir del portal: `--portal-bg`, `--portal-surface`, `--portal-border` (escala zinc oscuro).
- Reescribir `@utility portal-shell` y `@utility portal-card`: eliminar radiales pastel, blur de cristal y sombras de color. Fondo noir, bordes hairline (0.5px), tipografía Cormorant (display) + Inter Tight (texto).

### 3. Cabecera del portal (`src/routes/_authenticated/portal.tsx`)
- Sustituir el avatar arcoíris por el logo IC.
- Subnav: chip activo con subrayado coral en lugar de gradiente.
- Quitar `backdrop-blur-xl` y gradientes de color en el badge de mensajes.

### 4. Home del portal (`src/routes/_authenticated/portal/index.tsx`)
- Hero: nombre en versalitas con acento coral, sin `bg-clip-text` arcoíris.
- Chips Estado / Tier / Renovación como píldoras hairline (borde zinc, label zinc-500).
- Grid de 4 KPIs sobre fondo border con `gap-px`; cifra grande en Cormorant light; icono monocromo con anillo.
- "Próximo hito": barra vertical coral + versalitas coral.
- 6 tarjetas de acceso en papel oscuro, `border-zinc-800` → `hover:border-zinc-700`, icono hairline, flecha ↗ en hover.

### 5. Sidebar admin (`src/components/app-sidebar.tsx`)
- Sustituir el cuadrado "ic" por `<img>` con el logo IC (h-9, object-contain), conservando el wordmark cuando el sidebar está expandido.

### Fuera de alcance
- Sin cambios en queries, rutas, datos ni en el resto del admin más allá del logo.
