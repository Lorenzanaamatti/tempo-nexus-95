# Portada: arreglo de estructura y densidad

Objetivo: que la portada se vea completa sin hacer scroll y que respire como herramienta de trabajo, no como maqueta vacía. Sin tocar colores ni la paleta (eso se decide después).

## Cambios

1. **Compactar la cabecera**
   - Logo de h-28 a h-20.
   - "Herramienta interna" y saludo "Hola, NOMBRE" más juntos (menos margen).
   - Selector de vista justo debajo, en la misma zona, sin tanto aire.

2. **Puertas más bajas y densas** (`section-doors.tsx`)
   - Altura mínima de puerta de 7.5rem a ~4.5rem; padding vertical reducido.
   - Menos separación entre puertas (gap 4 → 3).
   - La descripción opcional se mantiene, en una línea.

3. **Bloques más juntos** (`index.tsx`)
   - Separación entre bloques de mt-12 a mt-8; título de bloque con menos margen inferior.
   - Ancho de página max-w-5xl → max-w-4xl para que la parrilla quede compacta.

4. **Orden razonable** (sin añadir ni quitar secciones)
   - "Cómo tienes el día" (2 puertas), "Datos económicos" (3, solo BIG C), "En qué vas a trabajar" (parrilla 3 columnas), "Recursos" y "Departamentos" al final.

## Resultado esperado

En una pantalla estándar de portátil se ven de un vistazo el saludo, el selector de vista y al menos "Cómo tienes el día", "Datos económicos" y la primera fila de "En qué vas a trabajar", sin scroll para las acciones principales.

## Técnico

- Solo se tocan `src/routes/_authenticated/index.tsx` y `src/components/section-doors.tsx` (espaciados y alturas; sin cambios de color, lógica ni rutas).
- Verificación con `bunx tsgo --noEmit` y captura de la portada en el navegador.
