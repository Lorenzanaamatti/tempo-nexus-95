# Política de usuarios de IC APP

> Documento interno. Define quién puede acceder a la aplicación, bajo qué condiciones y qué puede hacer en cada rol.
> Ver implementación técnica en:
> - `src/lib/use-role.ts`
> - `src/lib/users-admin.functions.ts`
> - `src/routes/_authenticated.tsx`
> - `src/routes/_authenticated/_admin.tsx`
> - `src/routes/_authenticated/_admin/users.tsx`

## 1. Alcance

Esta política aplica a cualquier persona que acceda a **IC APP**:

- Empleados y equipo interno de Interesante Compañía.
- Colaboradores externos con necesidad de acceso operativo.
- Compositores, artistas y demás talentos del roster que tengan un portal personal.

## 2. Registro y aprobación

- El registro está abierto mediante **email/contraseña** o **Google**.
- Toda nueva cuenta comienza en estado `pending` (pendiente de aprobación).
- **Ningún usuario puede acceder a la app hasta que un BIG C la apruebe y le asigne un rol.**
- Estados posibles de una cuenta:
  - `pending`: a la espera de revisión.
  - `active`: aprobada y con acceso según su rol.
  - `rejected`: rechazada o revocada. El usuario ve una pantalla de acceso denegado.

## 3. Roles y permisos

| Rol (código) | Nombre en la app | ¿Quién lo recibe? | Permisos |
|---|---|---|---|
| `admin` | **BIG C** | Socios / dirección | Acceso total: todo el back-office, módulo económico, calendarios, marketing, legal y gestión de usuarios (`/users`). |
| `team` | **TEAM** | Equipo operativo | Todo el back-office excepto el módulo económico y la gestión de usuarios. |
| `composer` | **ROSTER** | Compositores / artistas representados | Acceso únicamente a su portal personal (`/me`). No puede ver datos de otros talentos ni del back-office. |

### Jerarquía de acceso

```text
BIG C  →  Todo + gestión de usuarios + económico
TEAM   →  Todo excepto económico y usuarios
ROSTER →  Solo portal personal (/me)
```

## 4. Flujo de aprobación

1. Un usuario se registra en `/login`.
2. Su perfil se crea automáticamente con `status = 'pending'` y sin rol asignado.
3. Un BIG C accede a **Usuarios y permisos** (`/users`) y revisa las solicitudes pendientes.
4. Al aprobar, el BIG C selecciona el rol correspondiente (`admin`, `team` o `composer`).
5. Al rechazar, la cuenta pasa a `status = 'rejected'` y se le retira cualquier rol.
6. Un usuario activo puede cambiar de rol o ser revocado en cualquier momento por un BIG C.

### Reglas de seguridad del flujo

- Un BIG C **no puede quitarse a sí mismo el rol `admin`**. Esto evita quedar sin administradores.
- Solo los BIG C pueden ver el listado completo de usuarios, emails y roles.
- La gestión de usuarios usa el cliente de administración (`supabaseAdmin`) y verifica el rol del solicitante en el servidor.

## 5. Seguridad de acceso

- Las contraseñas deben tener al menos **6 caracteres**.
- Se recomienda activar la verificación de contraseñas filtradas (**HIBP**) para impedir el uso de credenciales conocidas.
- La sesión se gestiona a través de **Lovable Cloud / Supabase Auth**.
- En dispositivos compartidos, el usuario debe cerrar sesión al terminar.
- El acceso se revoca automáticamente si la cuenta pasa a `rejected`.

## 6. Baja / offboarding

- Cuando una persona deja de pertenecer al equipo o al roster, un BIG C debe cambiar su estado a `rejected` y, si aplica, eliminar su rol.
- Recomendación operativa: designar a una persona del equipo responsable de comunicar las bajas y ejecutar la revocación en un plazo máximo de 24 horas hábiles.
- La revocación de acceso no elimina automáticamente los datos históricos asociados a esa persona (producciones, tareas, etc.).

## 7. Acceso a datos de otros usuarios

- Cada usuario solo puede ver y editar la información que su rol le permite.
- El Roster accede exclusivamente a su propio perfil y documentación.
- El equipo (TEAM y BIG C) puede consultar datos del roster para fines operativos, pero no debe compartirlos fuera de la plataforma.
- Solo BIG C puede modificar roles y estados de aprobación.

## 8. Cambios en esta política

- Cualquier modificación a los roles, estados o permisos debe reflejarse en:
  - Este documento.
  - Los tipos `AppRole` y `ProfileStatus` en `src/lib/use-role.ts`.
  - La lógica de autorización en `src/lib/users-admin.functions.ts` y en los layouts protegidos.
- Antes de añadir un nuevo rol, confirmar que las políticas RLS de Supabase y los componentes de UI lo soporten.

## 9. Responsables

- **Aprobación técnica**: equipo de producto / desarrollo de IC APP.
- **Aprobación operativa**: dirección de Interesante Compañía (BIG C).
- **Aplicación diaria**: cualquier BIG C puede gestionar usuarios desde `/users`.
