# Ingesta de Premios y Festivales, previsualización e incorporación de contenidos

## Objetivo
Convertir Premios y Festivales en herramientas operativas para cargar listados, revisar cada dato y alimentar el calendario; completar además la gestión de archivos y contenidos de Comunicación.

## 1. Importación de Premios y Festivales
- Añadir en ambas pantallas un botón **Importar Excel/CSV** y una plantilla descargable con las columnas admitidas.
- Leer `.xlsx`, `.xls` y `.csv` en la propia aplicación, permitiendo elegir la hoja cuando el Excel tenga varias.
- Mostrar una revisión previa en tabla antes de guardar:
  - correspondencia entre columnas del archivo y campos de la aplicación;
  - normalización de fechas en formato español;
  - validación de campos obligatorios y valores permitidos;
  - errores y advertencias por fila;
  - selección de las filas que finalmente se importarán.
- Detectar posibles duplicados por nombre y edición, mostrando cada coincidencia para elegir **Actualizar**, **Omitir** o **Crear como nuevo**.
- Mantener intactas las notas y vinculaciones internas cuando se actualice un registro existente, salvo que el archivo aporte expresamente un nuevo valor.
- Presentar un resumen final con registros creados, actualizados, omitidos y rechazados.

## 2. Calendario automático
- Crear o actualizar los hitos de calendario asociados a cada registro importado o editado.
- Para Festivales: plazo de inscripción, inicio y fin de celebración.
- Para Premios: apertura de candidaturas, plazo de inscripción y gala/fallo.
- Diferenciar claramente cada tipo de hito en el título y evitar eventos duplicados al volver a importar.
- Eliminar o corregir automáticamente el hito correspondiente si se borra o cambia su fecha en la ficha de origen.
- Mostrar estos hitos en el Calendario general con vínculo de regreso al premio o festival.

## 3. Previsualización de Identidad corporativa
- Cambiar la acción principal de cada archivo: primero abrirá una ventana de previsualización y la descarga será una acción separada dentro de esa ventana.
- Previsualizar imágenes, PDF, vídeo, audio, texto, CSV/Excel y documentos Word con un visor adecuado al formato.
- Para formatos no renderizables de forma fiable, mostrar una ficha previa con nombre, formato, tamaño y recurso al que pertenece antes de habilitar la descarga.
- Aplicar el mismo comportamiento en las vistas de colecciones, cuadrícula y lista de Identidad corporativa.

## 4. Blog, EPK y Reels
- Sustituir las tres pantallas vacías por bibliotecas completas y editables basadas en el gestor de recursos ya existente.
- Permitir crear fichas con título, tipo/etiqueta, descripción o notas, enlace externo y varios archivos.
- Organizar cada pantalla con categorías propias y vistas de colecciones, cuadrícula y lista.
- Incorporar la misma previsualización previa a la descarga para los archivos de EPK y Reels, y para cualquier adjunto de Blog.

## 5. Verificación
- Probar importaciones válidas, filas erróneas, formatos de fecha distintos y duplicados en ambos listados.
- Confirmar que todos los hitos aparecen una sola vez y se actualizan al cambiar fechas.
- Probar creación, edición, subida, previsualización y descarga en Identidad, Blog, EPK y Reels.
- Revisar las pantallas en escritorio y móvil, además de la compilación y los errores en ejecución.

## Detalles técnicos
- Reutilizar el lector Excel ya instalado y el sistema actual de recursos y archivos.
- Añadir sincronización de calendario en la base de datos para que también funcione con altas y cambios ajenos al importador.
- Mantener los permisos actuales de Premios, Festivales y recursos; no ampliar el acceso a otros perfiles.
- No migrar ni alterar registros existentes; actualmente ambos listados están vacíos.
