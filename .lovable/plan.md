# Dar permisos completos (BIG C / admin) a una persona

No hace falta tocar código. La app ya tiene una pantalla de gestión de usuarios que permite asignar el rol `admin` (BIG C = permisos totales: edición, modificación, económico, aprobación, etc.).

## Baby steps

### Opción A — La persona ya se ha registrado en la app

1. Pídele que entre a la app y haga **Sign up / Sign in** con su email (Google o email+contraseña). Al registrarse quedará en estado `pending`.
2. Entra tú (como BIG C actual) y ve a **Usuarios** en el menú lateral (ruta `/users`, solo visible para admins).
3. Busca su email en la lista.
4. En su fila:
   - Cambia el **Estado** a `active` (aprobar).
   - Cambia el **Rol** a **BIG C** (admin).
5. Guarda. Pídele que recargue la app: ya tendrá acceso completo.

### Opción B — Aún no se ha registrado

1. Envíale el enlace de la app y que se registre con su email.
2. Sigue la Opción A desde el paso 2.

## Notas

- El rol **BIG C** (`admin`) da permisos totales: ver/editar todo, incluidos datos económicos, aprobar usuarios y asignar roles a otros.
- No puedes quitarte a ti mismo el rol admin (protección incorporada) — pide a otro BIG C que lo haga si hiciera falta.
- Queda registrado en la tabla `user_roles`; si en el futuro quieres revocar, vuelve a la misma pantalla y cambia el rol.

## Detalle técnico (referencia)

- Pantalla: `src/routes/_authenticated/_admin/users.tsx`
- Server function que aplica el cambio: `setUserRoleAndStatus` en `src/lib/users-admin.functions.ts` (requiere ser admin).
- Roles definidos: `admin` (BIG C), `team` (TEAM), `composer` (ROSTER) — ver `docs/POLITICA_USUARIOS.md`.

¿Quieres que además te deje preparado un atajo para promover directamente por email desde la base de datos (por si la persona no aparece o para el primer BIG C adicional)?