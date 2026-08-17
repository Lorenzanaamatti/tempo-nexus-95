# Densidad de etiquetas en Equipo IC

La lista de Equipo IC coloca en una sola línea, con el mismo peso visual, el nombre, el tipo (persona real / agente virtual), todas las funciones y el email. Con 7-8 funciones la fila se vuelve un muro de chips indistinguibles.

## Qué cambia

**1. Estructura de la fila en dos zonas**

```text
┌──────────────────────────────────────────────┬──────────────────────┐
│ CLÀUDIA PONS            · Persona real       │ claudia@…            │
│ DIRECCIÓN Y OPS  Agente · Manager            │ +34 600 000 000      │
│ LEGAL  Validación contratos                  │                      │
└──────────────────────────────────────────────┴──────────────────────┘
```

- Izquierda: identidad y funciones.
- Derecha: datos de contacto (email, teléfono) alineados, en texto secundario pequeño — dejan de competir con los tags.

**2. Jerarquía tipográfica en tres niveles**

- Nivel 1 — Nombre: display, grande, el único elemento con peso fuerte.
- Nivel 2 — Tipo de persona: etiqueta discreta junto al nombre (sin fondo, solo icono + texto en color atenuado para "Persona real"; el agente virtual mantiene un chip visible porque sí es una distinción de naturaleza).
- Nivel 3 — Funciones: chips pequeños, fondo muy tenue, agrupados.

**3. Agrupación visual de las funciones por categoría**

Las funciones ya están catalogadas por grupos (Dirección y operaciones, Legal, Discográfica/Editorial, Administración, Marketing/Comunicación, Agentes IA…). En la fila se agrupan por esa misma categoría: cada grupo va precedido de una etiqueta minúscula en versalitas atenuadas, y los grupos se separan entre sí con un espaciado mayor que el que hay entre chips del mismo grupo. Así el ojo salta de bloque a bloque en vez de leer 8 chips seguidos.

**4. Límite de densidad**

Máximo 5 funciones visibles por fila; el resto se resume en un chip "+3" con tooltip que las lista. La ficha de la persona sigue mostrando todas.

**5. Diferenciación cromática mínima**

Un único acento: el grupo "Agentes IA" usa el chip con tinte primario tenue (rojo flúor del sistema al 10%); el resto usan el gris neutro del sistema. Nada de una paleta por categoría — la separación la hace el espaciado y la etiqueta de grupo, no el color.

## Detalle técnico

- Fichero principal: `src/routes/_authenticated/_admin/people.index.tsx` (bloque de la lista, líneas ~190-214).
- Nuevo helper en `src/components/person-ic-functions-editor.tsx`: `groupIcFunctions(fns)` que devuelve `[{ groupLabel, items }]` reutilizando `IC_FUNCTION_GROUPS`, para no duplicar el catálogo.
- Nuevo componente de presentación `src/components/ic-function-tags.tsx` con la agrupación, el corte a 5 y el `+N` con tooltip, reutilizable en la ficha de persona.
- La query ya trae `email` y `phone`; solo hay que renderizar `phone`, no hay cambios de datos ni de backend.
- Todo con tokens semánticos existentes (`muted`, `muted-foreground`, `primary`) y la utilidad `smallcaps` ya definida en `src/styles.css`.
