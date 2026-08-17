# Limpieza de fugas de sistema y coherencia del botón de guardado

## 1. Texto interno filtrado en Calendario

En la cabecera del calendario aparece el nombre técnico de la tabla en monoespaciado. Se sustituye por lenguaje de producto:

> Todos los eventos de IC en un solo sitio: tareas, contratos, entregas, estrenos, check-ins y publicaciones aparecen automáticamente.

Sin monoespaciado y sin nombres de tabla. Además se revisan el resto de descripciones de secciones por si hay otras fugas del mismo tipo (nombres de tabla, campos, IDs) y se reescriben en lenguaje humano.

## 2. Botón flotante de guardado

Hoy es un círculo verde con un check, sin etiqueta visible, y el verde es un tercer color de acción sin token detrás. Cambios:

- **Deja de ser un icono suelto**: pasa a botón tipo píldora con icono y texto **"Guardar"** siempre visible ("Guardando…" mientras salva). Sigue anclado abajo a la derecha en las fichas largas.
- **Color**: pasa al rojo de acción del sistema (token `primary`, #FF2D16) sobre `primary-foreground`, alineado con el resto de acciones primarias. Se elimina el verde arbitrario.
- **Estado guardado**: confirmación breve usando el token semántico `success` que ya existe, solo como feedback momentáneo tras guardar, no como color permanente.
- **Accesibilidad**: se mantiene la etiqueta accesible y se marca claramente el estado deshabilitado.

Al ser un componente compartido, el cambio se aplica de una vez en fichas de compositor, contrato, producción, oportunidad y persona, y en los editores de disponibilidad, vídeos, fotos, proyectos e eventos.

## 3. Badge "Edit with Lovable"

Se oculta el badge en la app publicada mediante la opción de plataforma (requiere plan Pro o superior). Si el plan actual no lo permite, te lo indico y queda como está.

## Detalles técnicos

- `src/components/calendar-board/calendar-board.tsx`: reescritura del texto por defecto de la descripción.
- `src/components/save-button.tsx`: variante píldora con etiqueta, tokens `primary` / `primary-foreground`, feedback con `success`, sin colores hardcodeados.
- Verificación visual en navegador de una ficha de compositor y del detalle de contrato.
- Ajuste de visibilidad del badge en la configuración de publicación del proyecto.