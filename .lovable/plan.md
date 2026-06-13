
# Agentes virtuales con acciones verificadas

## Cómo va a funcionar (para ti)

Hoy AIDA solo escribe texto. Después de este cambio:

1. Le pides algo en el chat: *"AIDA, prepara un deal memo para Roque Baños sobre la película X, 25.000€, entrega 30 nov"*.
2. AIDA entiende la petición, **rellena un borrador real** dentro de la app y te muestra en el chat: *"He preparado el deal memo DM-2026-042. Tu verificador (tú o quien hayas asignado) lo verá en 'Acciones pendientes' para aprobar o rechazar."*
3. El verificador entra a una nueva sección **"Acciones de agentes"**, ve el borrador, lo edita si quiere, y pulsa **Aprobar** o **Rechazar**.
4. Solo al aprobar, el deal memo queda creado de verdad en la app. Si se rechaza, queda archivado con el motivo.

Nada se ejecuta sin pasar por el verificador. Si un agente no tiene verificadores asignados, no podrá proponer acciones (solo charlar).

## Qué podrá hacer cada agente (propuesta inicial — la editas tú)

Cada agente verá solo las herramientas que le asignes. Propuesta de partida basada en sus personas actuales:

| Agente | Herramientas que tendrá |
|---|---|
| **AIDA** (legal) | Crear borrador de deal memo · Crear borrador de contrato · Consultar deal memos/contratos abiertos · Añadir nota a ficha de compositor |
| **AITANA** (sugerido: finanzas) | Consultar presupuesto vs real · Listar facturas pendientes · Proponer registro de gasto · Resumen económico de una producción |
| **AINARA** (sugerido: A&R / roster) | Consultar disponibilidad de compositores · Proponer evento en calendario · Añadir nota a ficha · Buscar películas ES afines |
| **AITOR** (sugerido: producción) | Consultar fases de producción · Proponer evento en calendario · Listar entregas pendientes · Añadir nota a producción |

Te dejaré una pantalla donde marcas con checkboxes qué herramientas tiene cada agente. Cambiar el set es instantáneo.

## Lo que verás nuevo en la app

1. **En la ficha de cada agente virtual** (Personas → AIDA): un bloque nuevo **"Herramientas disponibles"** con checkboxes (Crear deal memo, Crear contrato, Proponer evento, etc.).
2. **En el chat con el agente**: cuando proponga una acción, verás una tarjeta dentro del chat con los datos del borrador y un enlace *"Ver en Acciones pendientes"*.
3. **Nueva sección en el menú: "Acciones de agentes"** (solo BIG C y TEAM). Lista de propuestas con estado (pendiente / aprobada / rechazada / ejecutada), agente que la propuso, verificador asignado, y botones Aprobar / Rechazar / Editar.
4. **En tu perfil (`/me`)**: contador *"X acciones pendientes de tu aprobación"*.

## Salvaguardas

- Un agente solo puede usar una herramienta si está marcada en su ficha.
- Toda acción propuesta requiere al menos un verificador asignado al agente. Si no, el chat responde *"Necesito un verificador asignado antes de poder proponer esta acción"*.
- Cada propuesta queda registrada con: agente, prompt original, datos generados, verificador, decisión, timestamp. Auditable.
- Las herramientas de **lectura** (consultar deal memos, presupuesto, etc.) no requieren aprobación — son solo para que el agente tenga contexto al responderte.
- Las herramientas de **escritura** (crear deal memo, evento, nota…) siempre pasan por el verificador.
- Respeta los niveles BIG C / TEAM / ROSTER: AITANA no podrá leer finanzas si la pide alguien sin permiso.

---

## Detalle técnico (para referencia, no es necesario que lo leas)

### Backend
- Nueva tabla `agent_actions` (id, agent_person_id, requested_by_user, tool_name, payload jsonb, status, verifier_person_id, decided_by, decided_at, decision_notes, executed_at, resulting_entity_id). Con RLS por rol.
- Nueva tabla `agent_tools` (agent_person_id, tool_name, enabled). Define qué herramientas tiene cada agente.
- Catálogo de tools en `src/lib/agent-tools.ts`: cada tool tiene `name`, `description`, `inputSchema` (Zod), `kind: "read" | "write"`, y `execute(payload)` (solo para read; las write se ejecutan tras aprobación).
- `chatWithAssistant` se amplía: lee las tools habilitadas del agente, las pasa a Claude con `tools: [...]`, hace el bucle de `tool_use` → resultado → respuesta. Las write tools, en vez de ejecutar, insertan una fila en `agent_actions` (status=pendiente) y devuelven al modelo *"Acción propuesta DM-…, queda pendiente de aprobación"*.
- Server fn `approveAgentAction(id)` / `rejectAgentAction(id, notes)`: valida que el usuario es verificador del agente, ejecuta el insert real en la tabla destino, marca `executed_at`.

### Frontend
- `src/routes/_authenticated/_admin/agent-actions.tsx`: cola de aprobaciones.
- Editor de tools en la ficha de cada agente (debajo de "Persona / System prompt").
- En `AssistantChat`, render de cards de tool_use/tool_result usando `message.parts` para mostrar los borradores que propone el agente.

### Orden de implementación
1. Tabla `agent_actions` + `agent_tools` + RLS + GRANTs (1 migración).
2. Catálogo inicial de 4 herramientas read + 4 write (deal memo, contrato, evento, nota).
3. Loop de tool calling en `chatWithAssistant`.
4. Editor de tools por agente.
5. Pantalla de acciones pendientes + flujo aprobar/rechazar/ejecutar.
6. Badge de "pendientes" en `/me` y en sidebar.

---

¿Apruebas este plan? Si quieres ajustar el reparto de herramientas por agente (sobre todo AINARA/AITANA/AITOR que no me has confirmado su rol), dímelo antes y lo incorporo.
