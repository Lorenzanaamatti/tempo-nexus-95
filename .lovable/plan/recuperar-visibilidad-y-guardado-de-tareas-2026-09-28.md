# Recuperar visibilidad y guardado de tareas

## Objetivo
- Eliminar la cuenta duplicada `claudiaponsram@gmail.com`, conservando la cuenta de trabajo de Clàudia.
- Confirmar qué ocurrió con «haetra» y con las tareas nuevas de Clàudia.
- Evitar que una tarea guardada parezca perdida por filtros o falta de actualización.

## Cambios
- Añadir una eliminación segura de usuarios reservada a BIG C y usarla para retirar la cuenta duplicada.
- Hacer que el alta de tareas confirme la fila realmente guardada y actualice inmediatamente todos los listados y contadores relacionados.
- Mostrar tras el alta una confirmación clara y llevar «Mis tareas» a un estado donde la nueva tarea resulte visible cuando corresponda.
- Mantener visibles para BIG C las tareas de otras personas mediante «Todas», sin cambiar responsables ni estados.

## Verificación
- Comprobar en la base de datos que «haetra» y las entradas recientes de Clàudia existen con creador y responsable correctos.
- Crear una tarea de prueba desde la aplicación, comprobar que aparece al instante y eliminarla después.
- Confirmar que la cuenta Gmail duplicada ya no existe y que la cuenta `claudia@juny.tv` sigue vinculada a Clàudia.
