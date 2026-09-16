# Presupuestos de supervisión musical desde plantilla

Sí, se puede. Convierto el documento que has subido en una plantilla viva dentro de Recursos · Templates, con formulario, previsualización, descarga e historial por proyecto.

## Dónde vive

En **Templates · Templates presupuesto** aparece una nueva categoría "Supervisión musical" con la plantilla base creada a partir de tu documento (texto, estructura y logotipo). Desde ahí, botón **Nuevo presupuesto**.

## La ficha que completas

- Fecha (por defecto hoy)
- Título del presupuesto
- Proyecto (buscador entre producciones y oportunidades; si no existe, se crea un proyecto provisional con ese título)
- Cliente / empresa, persona de contacto, email
- Idioma: español o inglés (texto base bilingüe; otros idiomas vía traducción automática)
- Precio + moneda + nota de impuestos ("más IVA")
- Director y tipo de obra (largometraje, serie, documental…) para la frase de apertura
- Servicios incluidos: lista con casillas ya marcadas por defecto, más campo para añadir líneas propias y reordenarlas
- Firma: nombre, cargo, teléfono (por defecto los de tu ficha de equipo)
- Notas internas

## Previsualización y salida

- Vista previa del documento montado con el logotipo, tal cual saldrá
- **Descargar Word (.docx)** y **Descargar PDF**
- **Enviar por email**: a tu correo, y/o a otros destinatarios añadidos, con el PDF adjunto o enlace de descarga

## Archivo por proyecto

Cada presupuesto enviado queda en **Presupuestos enviados** dentro de la ficha del proyecto (producción u oportunidad), con fecha, destinatarios, idioma, importe, estado (borrador / enviado) y el archivo generado. Si el proyecto era provisional, al completar sus datos el historial se conserva.

## Detalles técnicos

- Tablas nuevas: `budget_templates` (texto base por idioma, bloques de servicios por defecto, logo) y `budgets` (datos de la ficha, servicios elegidos, importe, idioma, estado, `production_id` / `opportunity_id`, PDF/DOCX en Storage, destinatarios y fecha de envío). RLS por `current_user_is_staff()` y GRANTs.
- Generación: servidor TanStack (`createServerFn`) que renderiza el documento a DOCX (`docx`) y a PDF; los archivos se guardan en un bucket privado y se sirven con URL firmada.
- Logotipo: se usa el logotipo oficial de Interesante Compañía ya presente en la app (si prefieres el del documento subido, lo cambio).
- Proyecto provisional: se crea una oportunidad mínima con el título y marca "provisional" para completarla después.
- Traducción a idiomas fuera de ES/EN mediante la IA ya integrada.

## Envío por email

El envío desde la app requiere un dominio propio verificado (aún no configurado). Construyo primero la plantilla, la ficha, la previsualización, las descargas y el archivo por proyecto; en cuanto verifiques el dominio activo el envío por email y el archivado automático del envío.

## Fuera de alcance por ahora

Firma electrónica del presupuesto y conversión automática a contrato.
