# Onboarding Plusmusic / Interesante Compañía en la app

## Respuestas rápidas

**¿Se puede hacer con los GIF existentes?** Sí. El PowerPoint lleva dentro 17 GIF animados y 9 imágenes. Todos se pueden reutilizar tal cual. Dos son muy pesados (uno de 19 MB y otro de 8 MB): se convertirán a vídeo corto en bucle, que se ve igual pero carga 10 veces más rápido.

**¿Qué formato?** El contenido no es un tutorial de la app, es un relato de bienvenida (quiénes somos, quién es quién, cómo se hace una película, valores). Por eso el formato adecuado es un **onboarding por capítulos, en pantalla completa, diapositiva a diapositiva**, no un vídeo ni un documento:
- 4 capítulos: 1) Bienvenida y empresa, 2) Personas y clientes, 3) Misión, visión, valores y objetivos, 4) Cómo se hace una película.
- Avance con flechas o teclado, barra de progreso, índice lateral para saltar.
- Se guarda por dónde va cada persona y se marca "completado" al terminar.
- Al entrar por primera vez, a una persona nueva del equipo le aparece una invitación a hacerlo.

**Vista Team y BIG C**
- Team: ve y recorre el onboarding; ve su progreso.
- BIG C: lo mismo, más el botón **Editar** y un panel con quién lo ha terminado y quién no.
- Roster (compositores) no lo ve.

**Editable (solo BIG C)**
- Cambiar título y texto de cada diapositiva, reordenar, añadir o quitar diapositivas, cambiar o subir GIF/imagen.
- Cambios guardados al instante; no se pierde nada al editar.

## Correcciones ortográficas detectadas (en catalán)

- COMPAÑIA → COMPAÑÍA; "Juny, Fronterah -" repetido, se deja una sola vez
- col.lectiva → col·lectiva; novel.la → novel·la
- és una costum → és un costum; "Té a veure amb que" → "Té a veure amb el fet que"
- tú → tu; aixeca la ma → aixeca la mà; perque → perquè
- será → serà; explicar be → explicar bé; guio → guió
- canvíen → canvien; la seva funció es dirigir → és dirigir
- esencial/esencials → essencial/essencials; sino → sinó
- distribuidors → distribuïdors; importancia → importància; produïr → produir
- teníen → tenien; díes → dies; fotografía → fotografia; prostproducció → postproducció
- Falta cerrar el paréntesis tras "la flauta travessera"
- Diapositiva 19: la frase "garantir el resultat en…" está cortada; te la marcaré para que la completes
- Diapositivas 4, 10, 17 y 23 son solo imagen/título: se mantienen como separadores de capítulo

El texto se mantiene en catalán, como el original.

## Detalles técnicos

- Nueva tabla `onboarding_slides` (orden, capítulo, título, cuerpo en texto enriquecido simple, media_url, tipo) y `onboarding_progress` (usuario, última diapositiva, completado_en). RLS: lectura staff (`current_user_is_staff()`), escritura de diapositivas solo admin, progreso solo el propio usuario.
- Bucket privado `onboarding-media` con los GIF/imágenes extraídos del pptx; los GIF > 5 MB se convierten a MP4/WebM en bucle con ffmpeg.
- Carga inicial de las 24 diapositivas (ya corregidas) mediante migración con INSERT; sin tocar ningún dato existente.
- Ruta `/recursos/tutoriales` pasa a listar el onboarding; nueva ruta visor pantalla completa y modo edición para admin. Aviso de primera entrada en la portada para team sin progreso completado.
