# Reconstrucción completa de Subvenciones

## Objetivo
Convertir Subvenciones en un gestor completo de expedientes: alta en unos 30 segundos, listado operativo y ficha detallada por bloques. Se conservarán los datos actuales y las conexiones con calendario, tareas y KPIs.

## 1. Alta rápida
- Sustituir el formulario genérico actual por una pantalla específica con:
  - Nombre corto y nombre oficial.
  - Organismo convocante.
  - Empresa solicitante y proyecto/área, ambos como texto libre.
  - Tipo de ayuda: subvención, préstamo, bonificación, financiación u otra.
  - Importe máximo y porcentaje subvencionable.
  - Deadline y periodo de ejecución.
  - Responsable interno.
  - Estado y URL oficial.
- Usar el catálogo completo de 11 estados: Por preparar, En preparación, Pendiente firma, Presentada, Subsanación, Concedida, Denegada, En ejecución, En justificación, Cobrada y Cerrada.
- Tras guardar, abrir el resumen del expediente con accesos claros a Ficha completa, Documentación, Calendario y Presupuesto.

## 2. Listado general
- Una fila por subvención con: nombre corto, organismo, empresa/proyecto, importe máximo, deadline, días restantes, estado y responsable.
- Búsqueda, orden y filtros por deadline, empresa, proyecto, organismo, estado y responsable.
- Indicador visual prioritario de plazo: días restantes o “Vencida”.
- Mantener exportación y hacer que cada fila abra la nueva ficha individual.

## 3. Ficha individual
Crear una ruta propia para cada subvención y organizarla en bloques navegables dentro de una sola ficha:

1. **Identificación**: convocatoria, organismo, empresa, proyecto/área/representado, responsable, asesor, URLs, expediente y estado.
2. **Economía y tesorería**: límites de la convocatoria, solicitud, aportación propia, financiadores, concesión, justificación, cobros, anticipo, financiación temporal e IVA.
3. **Presupuesto del proyecto**: partidas editables con concepto, categoría, proveedor, previsto, elegible, porcentaje financiable, subvención imputable, aportación propia, oferta, factura, pago y justificación.
4. **Calendario**: múltiples hitos con fecha oficial, fecha interna de trabajo, responsable, estado y alerta.
5. **Documentación**: checklist editable con obligatoriedad, responsable, proveedor del documento, plantilla, archivo, estado, firma, firmante, fechas y observaciones.
6. **Instrucciones de presentación**: formulario, idioma, límites de páginas/archivos, firma, certificado, ofertas exigidas, modelos, portal, forma de presentación y “Reglas que no puedo olvidar”.
7. **Tareas**: tarea, responsable, fecha límite, dependencia con otra tarea, estado, documento asociado y prioridad.
8. **Datos de presentación**: fecha/hora, registro, expediente, justificante, copia presentada, importe, presupuesto y persona que presentó.
9. **Resolución y cobro**: resolución provisional/definitiva, alegaciones, importes, condiciones, aceptación, anticipo, saldo y cobros.
10. **Justificación**: requisitos, responsable, documentación exigida, preparación, presentación, importes aceptados, requerimientos y cierre.

## 4. Automatizaciones
- Calendarizar los hitos usando la fecha interna para el trabajo y conservar también la fecha oficial.
- Crear alertas y tareas vinculadas al responsable; mantener el preaviso de 30 días actual para el deadline principal.
- Corregir los enlaces del calendario para que abran la nueva ficha individual y reconocer “Subvención” como categoría propia.
- Al cambiar el estado a **Presentada**, crear automáticamente una versión inalterable del presupuesto y del inventario documental presentado.
- Añadir un botón **Enviar al presupuesto general**: solo al pulsarlo se copiarán las partidas seleccionadas, evitando sincronizaciones involuntarias y duplicados.
- Mantener los KPIs actuales adaptando “solicitadas” al nuevo catálogo de estados y conservando concedidas e importe concedido.

## 5. Datos y seguridad
- Ampliar la tabla principal sin renombrar los campos que ya alimentan calendario y KPIs.
- Crear tablas relacionadas para partidas, hitos, documentos, tareas/dependencias y versiones de presentación.
- Guardar archivos en almacenamiento privado y permitir acceso únicamente a usuarios autorizados.
- Mantener la restricción actual: Subvenciones solo es visible y editable para Dirección/BIG C.
- Incluir permisos explícitos, protección por fila y actualización automática de fechas en todas las tablas nuevas.
- Como actualmente no hay subvenciones guardadas, no es necesaria una migración de expedientes existentes; aun así, se preserva compatibilidad estructural.

## 6. Presentación visual
- Mantener el fondo blanco cálido y los títulos Aubergine Pantone #47353F.
- Usar las tipografías propias del sitio en tamaños legibles, ocupando el ancho disponible sin grandes espacios vacíos.
- Diseñar la ficha como herramienta de trabajo densa y clara: cabecera resumen fija, navegación entre bloques, tablas amplias y acciones visibles.
- Adaptar escritorio y móvil sin convertir la ficha en una sucesión de tarjetas anidadas.

## 7. Verificación
- Probar alta rápida, edición completa, filtros, orden, días restantes y exportación.
- Probar partidas, hitos, documentos, tareas, dependencias y adjuntos.
- Confirmar calendario, alertas, enlace desde eventos y envío manual al presupuesto general.
- Confirmar que “Presentada” genera una única versión inalterable y que posteriores cambios no la modifican.
- Verificar permisos de Dirección/BIG C, compilación y pantallas de escritorio y móvil.
