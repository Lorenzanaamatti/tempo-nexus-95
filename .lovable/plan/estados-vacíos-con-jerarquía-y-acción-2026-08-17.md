# Estados vacíos con jerarquía y acción

Hoy conviven dos formas de "no hay nada": un `EmptyState` genérico (icono buzón + una línea gris) y unas 55 frases sueltas en `<p class="text-muted-foreground">` ("Sin oportunidades aún.", "Sin proyectos activos este año.", "Sin contratos.", "Sin documentos."). Ninguna dice qué hacer a continuación.

## Qué se construye

### 1. Componente `EmptyState` renovado

Tres zonas con jerarquía clara:

```text
┌──────────────────────────────────────────┐
│              [ icono en círculo ]        │
│           TÍTULO EN MAYÚSCULAS           │
│   Una línea que explica qué falta y      │
│   por qué está vacío.                    │
│      [ Acción principal ]  Secundaria    │
└──────────────────────────────────────────┘
```

- Icono contextual (no siempre el buzón): oportunidades, tareas, contratos, documentos, personas, calendario, búsqueda.
- Título corto en mayúsculas (misma convención `.title-caps` del resto de la app).
- Descripción orientativa en una frase.
- Acción principal en rojo flúor (#FF2D16) y, opcionalmente, una acción secundaria en texto.

### 2. Tres variantes

- **`block`** (por defecto): pantallas y listados principales, con CTA.
- **`inline`**: paneles y tarjetas dentro de una ficha (compacto, una sola línea + botón discreto). Sustituye a las frases sueltas sin romper la densidad de las fichas.
- **`filtered`**: hay datos, pero los filtros no devuelven nada. Icono de lupa, texto "Ningún resultado con estos filtros" y acción **Limpiar filtros**.

Esta última distinción es clave: hoy "no hay nada creado" y "tus filtros no encuentran nada" muestran el mismo mensaje, y la acción correcta es opuesta (crear vs. limpiar).

### 3. Despliegue por pantallas

Con copy y CTA reales, empezando por las de uso diario:

| Pantalla | Título | Acción |
|---|---|---|
| Oportunidades | SIN OPORTUNIDADES | Nueva oportunidad |
| Cuentas objetivo | SIN CUENTAS OBJETIVO | Nueva cuenta |
| Candidaturas | SIN CANDIDATURAS | Nueva candidatura |
| Tareas | TODO AL DÍA | Nueva tarea |
| Roster / Clientes | SIN FICHAS | Añadir ficha |
| Contratos y deal memos | SIN CONTRATOS | Nuevo contrato |
| Producciones | SIN PRODUCCIONES | Nueva producción |
| Equipo IC | SIN PERSONAS | Añadir persona |
| Marketing y Legal (bibliotecas) | SIN ARCHIVOS | Subir archivo |
| Calendario | SIN EVENTOS | Nuevo evento |
| Búsqueda global | SIN RESULTADOS | (sin CTA) |

Y las secciones internas de fichas (proyectos activos, candidaturas del compositor, producciones asociadas, documentos, fases, verificadores, asignaciones, equipo, eventos, gastos) pasan a `inline` con su acción propia cuando la sección ya tiene un botón de añadir.

Portal del roster (mensajes, prensa, contratos, propuestas, facturación) recibe la variante `block` sin CTA de creación: ahí el usuario no crea contenido, así que el texto explica quién lo publicará.

## Detalles técnicos

- Se amplía `src/components/list-states.tsx`: `EmptyState` acepta `icon`, `title`, `description`, `action` (`{ label, onClick | to+params }`), `secondaryAction` y `variant: "block" | "inline" | "filtered"`. Se mantiene la prop `hint` como alias de `description` para no romper los 8 usos actuales durante la migración.
- El botón de acción usa el `Button` del sistema (`variant="default"` = rojo flúor) y `Link` de TanStack cuando la acción es navegación, nunca `<a href>`.
- Sin colores nuevos: fondo `muted/30`, borde discontinuo `border-border`, icono en `text-muted-foreground`, único acento el primario existente.
- Se sustituyen las ~55 frases sueltas por el componente; no se toca ninguna consulta ni lógica de datos.
