# Rediseño completo de la portada

## Objetivo

Convertir la bienvenida actual en una portada amplia, editorial y claramente navegable, manteniendo intactos permisos, datos y destinos.

## Cambios

- Usar todo el ancho disponible con una cabecera de marca generosa: logotipo grande y centrado, nombre de la herramienta, saludo y selector de vista bien separados.
- Organizar la página en bandas visuales de ancho completo, evitando la actual columna estrecha y la sucesión de cajas iguales.
- Mostrar los títulos de sección en aubergine, con una jerarquía clara y tamaño proporcionado.
- Rediseñar las puertas como accesos de aspecto editorial: título aubergine, explicación visible y un indicador de entrada; estados activos en aubergine con texto claro.
- Dar identidad distinta a “Cómo tienes el día”, “Datos económicos”, “En qué vas a trabajar”, “Recursos” y “Departamentos” mediante composición, ritmo y apoyos suaves en rust/avocado, sin convertir cada bloque en otra tarjeta.
- Escribir descripciones útiles para todos los accesos, incluidos Recursos, Departamentos y Datos económicos.
- Mantener el fondo blanco cálido, la paleta acordada, los destinos actuales y la visibilidad por rol.
- Ajustar la composición para escritorio y móvil, comprobando que no haya textos cortados, solapamientos ni fondos azules.

## Alcance técnico

- Rehacer la composición de la portada autenticada.
- Ampliar el componente reutilizable de puertas sin romper las pantallas que ya lo usan.
- Añadir únicamente los tokens visuales globales necesarios.
- Verificar la portada en escritorio y móvil y revisar los avisos de funcionamiento.
