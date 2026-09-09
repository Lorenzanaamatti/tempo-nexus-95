# Auditoría y plan de corrección

He revisado la app contra la base de datos real. Los problemas que reporta la usuaria tienen causa concreta y confirmada; no son falta de datos.

## Lo que he verificado

- **Oportunidades de venta: el equipo no puede crearlas.** La regla de acceso de la base de datos permite escribir solo a BIG C, pero la pantalla la ven también los perfiles TEAM. El botón aparece, el formulario se rellena y el guardado se rechaza. Causa real del "no podem afegir-les".
- **Productoras duplicadas en dos sitios.** Las productoras que se crean desde una producción o una oportunidad se guardan en un sitio, y la pantalla Partners › Productoras lee de otro. Hay 3 productoras que no aparecen en Partners y 12 creadas en los últimos dos meses. Nunca se sincronizan.
- **Sin contactos múltiples por productora.** Cada productora admite un único nombre, email y teléfono.
- **Producciones: la pantalla Seguimiento no se refresca.** Al crear una producción se refresca "Activas" pero no "Seguimiento": hay que recargar. Además, las listas mezclan producciones reales con fichas derivadas de filmografías y del catálogo español, que se ven igual pero no se pueden abrir ni editar: parecen producciones que "no se actualizan".
- **Calendario sin Gantt y casi sin procesos.** Solo hay 1 proceso con fechas en toda la app, y un proceso solo llega al calendario si tiene fecha de inicio **y** de fin. El Gantt existe pero en una pantalla aparte, no dentro del calendario.
- **Sin desglose de gastos por producción.** Los gastos existen solo a nivel de compañía y por año, sin vincular a producción ni a compositor.

## Qué voy a hacer, en orden

### 1. Desbloqueos (los "no s'actualitzen")
- Permitir a los perfiles TEAM crear y editar oportunidades, productoras, directores y producciones; dejar solo lo económico y las bajas para BIG C.
- Unificar productoras: una única lista. Todas las productoras creadas desde producciones y oportunidades aparecen en Partners › Productoras y viceversa, con sincronización automática permanente.
- Refrescar todas las pantallas afectadas al crear o editar (Activas, Seguimiento, Partners, ficha del compositor y calendario).
- Distinguir visualmente las fichas derivadas (catálogo, filmografía) de las producciones propias, con un botón "convertir en producción" para poder editarlas.

### 2. Contactos por productora
- Varios contactos por productora: nombre, cargo, email, teléfono, notas y contacto principal. Disponible tanto desde Partners como desde la ficha de la producción.

### 3. Calendario en Gantt con todos los procesos
- Plantillas automáticas de procesos al crear una producción, según el tipo (largometraje, serie, documental, publicidad), siempre editables a mano y ampliables:
  entrega del plocked, inicio de composición, aprobación de las obras, período de grabación, período de mezclas, entrega de bobinas 1 a 5, y entregas especiales.
- Las entregas especiales (SIFF, canción, feedback del cliente) se marcan como hito destacado y se ven con más peso visual.
- El Gantt pasa a ser una vista dentro del Calendario, con filtro por compositor, por producción y por responsable (agencia / representado / productora), y una vista global de todos los compositores a la vez para detectar solapes.
- Un proceso con solo fecha de inicio también se mostrará (hoy se ignora si le falta la fecha de fin).

### 4. Gastos por producción en el dashboard del compositor
- Cada producción tendrá su lista de gastos con concepto, importe, fecha y proveedor, con conceptos predefinidos (músicos, estudio, mezcla, máster, orquestador, copistería, licencias, viajes, otros) y campo libre.
- En la ficha y el portal del compositor: total de gastos por producción, desglose por concepto y margen frente al caché.

### 5. Chat
- Se elimina el chat interno de la app (canales por compositor y por producción) y sus accesos en fichas y portal. El asistente de IA se mantiene, es otra cosa.

### 6. Higiene general (detectada en la auditoría)
- Corregir las consultas que ocultan errores y muestran una lista vacía en lugar de avisar: es el origen de los "he creado algo y no aparece".
- Paginar los listados grandes y guardar caché para eliminar los parpadeos y recargas constantes.
- Restringir el histórico de auditoría y las oportunidades de prensa a BIG C/TEAM (hoy los ve cualquier usuario con cuenta, incluido el roster).

## Detalles técnicos

- Migraciones: política RLS de escritura de `opportunities`/`production_companies`/`directors` de `current_user_is_admin()` a `has_role(admin|team)`; trigger bidireccional `production_companies` ↔ `partners` (o vista unificada con `partners` como tabla canónica y backfill de las filas huérfanas); nueva tabla `company_contacts` con GRANT + RLS; nueva tabla `production_expenses` (production_id, composer_id, concepto, importe, fecha, provider_id) con GRANT + RLS; `production_phases` gana `is_milestone`, `template_key` y `sort`; ajuste de `sync_production_phase_calendar()` para emitir evento con `end_date := coalesce(end_date, start_date)`.
- Frontend: plantillas de procesos en `src/lib/production-milestones.ts`; `ProductionGantt` embebido en `calendar-board` como modo de vista con filtros por compositor/responsable; `useProductions` marca `source` y deshabilita edición en filas derivadas; invalidación de `["produccion-seguimiento"]` junto a `["productions-lifecycle"]`; retirada de `composer-chat.tsx`, `chat_channels`/`chat_messages` y sus triggers de seed.
- Riesgo: la unificación de productoras toca datos existentes; se hará con backfill idempotente por nombre normalizado y sin borrar filas.
