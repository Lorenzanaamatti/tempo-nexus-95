# Documentos de venta: biblioteca y compositor

## Objetivo
Convertir **Documentos de venta** en una biblioteca de modelos reutilizables y un compositor para crear documentos especiales sin alterar los originales.

La pantalla actual está vacía, pero la base ya contempla título, propósito, audiencia, idioma, versión, etiquetas y varios archivos por documento. Se aprovechará esa estructura y se conservarán los tres registros existentes.

## Qué podrá hacer el equipo

### 1. Biblioteca de modelos
- Dar de alta modelos en PowerPoint, Word y PDF.
- Informar título, propósito, idioma, versión, audiencia, notas y etiquetas libres.
- Añadir varios archivos o variantes al mismo modelo.
- Buscar y filtrar por propósito, idioma, formato, versión y etiquetas.
- Previsualizar cada archivo antes de descargarlo.
- Duplicar, sustituir, archivar o actualizar modelos sin perder la versión anterior.

### 2. Compositor de documentos especiales
- Iniciar un documento especial con nombre, propósito, idioma y etiquetas.
- Añadir archivos completos o seleccionar partes concretas:
  - diapositivas en PowerPoint;
  - páginas en PDF;
  - páginas o bloques identificados en Word.
- Ver miniaturas, seleccionar, reordenar y eliminar partes mediante arrastrar y soltar.
- Mezclar contenido de varios modelos manteniendo siempre intactos los originales.
- Guardar el trabajo como borrador para retomarlo o duplicarlo después.

### 3. Generación y descarga
- Para composiciones PowerPoint: generar un `.pptx` editable conservando las diapositivas elegidas y una versión PDF lista para enviar.
- Para composiciones PDF: generar un PDF único con las páginas seleccionadas y ordenadas.
- Para Word: generar un `.docx` editable cuando la composición use contenido Word compatible y su PDF correspondiente.
- Para mezclas de formatos: generar siempre PDF; además, generar un PowerPoint editable cuando sea viable, incorporando como páginas no editables aquellas partes procedentes de PDF o Word.
- Mostrar antes de generar qué partes conservarán edición completa y cuáles quedarán como imagen/página cerrada.
- Registrar fecha, autor, modelos usados y archivos resultantes.

## Pantallas
1. **Documentos de venta**: dos accesos principales, “Biblioteca de modelos” y “Crear documento especial”.
2. **Biblioteca**: listado amplio con filtros, vista previa y alta/edición de modelos.
3. **Ficha del modelo**: metadatos, versiones, archivos y previsualización por diapositivas o páginas.
4. **Compositor**: biblioteca a la izquierda, lienzo ordenable en el centro y resumen del resultado a la derecha.
5. **Documentos creados**: borradores y documentos generados, con descarga, duplicado y trazabilidad.

## Reglas importantes
- Los originales nunca se modifican durante una composición.
- Idioma y propósito son obligatorios; las etiquetas son libres.
- Solo BIG C puede crear, modificar o eliminar modelos y composiciones; el resto del equipo autorizado puede consultar y descargar.
- Los archivos permanecen privados y se sirven mediante accesos temporales.
- Se validarán formato, tamaño y corrupción antes de incorporar un archivo.
- Si una conversión no puede preservar elementos editables, se avisará antes de generar el resultado.

## Implementación técnica
- Ampliar el modelo de datos existente con formato, estado y versionado; crear registros de composiciones, bloques seleccionados y archivos generados, con permisos y políticas de acceso.
- Reutilizar el almacenamiento privado actual de materiales de marketing.
- Extraer miniaturas y estructura de PPTX, DOCX y PDF sin ejecutar contenido incorporado.
- Implementar un motor de composición por manifiesto: cada bloque guarda archivo de origen, posición original, orden final y modo de incorporación.
- Ejecutar la generación en el servidor con herramientas compatibles con el entorno; la interfaz consultará el estado y mostrará errores concretos por archivo.
- Mantener la previsualización y descarga existentes como patrón visual, usando fondo blanco cálido y títulos Aubergine.

## Verificación
- Probar alta, edición, búsqueda, filtros, previsualización y versionado con PPTX, DOCX y PDF.
- Crear una composición con archivos completos y otra seleccionando partes.
- Crear una composición mixta y comprobar el aviso de editabilidad.
- Abrir los resultados en PowerPoint, Word y un lector PDF; comprobar orden, imágenes, tipografías y ausencia de archivos dañados.
- Verificar permisos BIG C/equipo, descargas privadas y funcionamiento en escritorio y móvil.
