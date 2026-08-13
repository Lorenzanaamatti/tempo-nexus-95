# Herramientas MCP de escritura para Claude

Añadir 3 nuevas herramientas al servidor MCP para que Claude (u otros clientes conectados) pueda transformar una orden en acciones concretas. Todas las escrituras se realizan como el usuario autenticado, respetando RLS (solo BIG C / admin puede escribir en estas tablas), y cada una lleva `needsApproval: true` para que el cliente MCP muestre confirmación antes de ejecutar.

## Nuevas herramientas

### 1. `create_task` — Crear una tarea
Inserta en `public.actions`.
- **Input**: `title` (obligatorio), `notes?`, `due_date?` (YYYY-MM-DD), `assignee_person_id?` (uuid de la persona del equipo IC), `area?`, `subject_type?` + `subject_id?` (para vincular a una cuenta objetivo, oportunidad, película, etc.), `kind?` (por defecto `tarea`).
- El trigger existente `trg_sync_action_calendar` la publica automáticamente en el calendario.
- Devuelve el registro creado.

### 2. `create_target_account` — Crear una nueva cuenta objetivo (cliente)
Inserta en `public.target_accounts`.
- **Input**: `name` (obligatorio), `account_type` (`roster` | `productora` | `plataforma` | `otros`, por defecto `productora`), `roster_kind?`, `other_label?`, `sector?`, `website?`, `priority?` (`alta`|`media`|`baja`), `status?`, `responsible_person_id?`, `next_step?`, `next_step_date?`, `notes?`.
- Devuelve el registro creado.

### 3. `update_target_account` — Modificar una cuenta objetivo existente
Update parcial sobre `public.target_accounts` por `id`.
- **Input**: `id` (obligatorio) + cualquier subconjunto de: `name`, `status`, `priority`, `responsible_person_id`, `next_step`, `next_step_date`, `notes`, `website`, `sector`, `account_type`, `roster_kind`, `other_label`.
- Solo actualiza los campos que Claude envía.
- Devuelve el registro actualizado.

### Herramienta auxiliar (lectura) para desambiguar
- `search_team_members`: busca personas del equipo IC por nombre para obtener el `assignee_person_id` / `responsible_person_id` correcto antes de crear tareas o cuentas. Sin ella, Claude tendría que adivinar el uuid.

## Detalles técnicos

- Archivos nuevos en `src/lib/mcp/tools/`: `create-task.ts`, `create-target-account.ts`, `update-target-account.ts`, `search-team-members.ts`.
- Registrar los 4 en `src/lib/mcp/index.ts` (`tools: [...]`).
- Cada handler sigue el patrón existente: cliente Supabase con `Authorization: Bearer ${ctx.getToken()}` para que RLS aplique como el usuario que llama. Si el usuario no es admin, la escritura falla por política — comportamiento correcto.
- `annotations`:
  - Creaciones: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`.
  - Update: `readOnlyHint: false`, `destructiveHint: true` (modifica datos existentes).
- `needsApproval: true` en las 3 de escritura → Claude pedirá confirmación al usuario antes de ejecutar.
- Validación con Zod, sin `.min/.max` en enums complejos; los enums cortos (`account_type`, `priority`, `status`) se declaran como `z.enum([...])`.
- Ejecutar `app_mcp_server--extract_mcp_manifest` al final para regenerar el manifest.

## Fuera de alcance
- Borrado de registros (más peligroso; se puede añadir después si lo pides).
- Escritura sobre oportunidades, deal memos o candidaturas (se puede añadir en una segunda tanda).
