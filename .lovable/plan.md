# Plan: Política de usuarios (control de acceso)

## Objetivo
Crear una documentación interna clara que defina quién puede acceder a la app, bajo qué condiciones y qué puede hacer. La política se basa en la implementación actual y se completa con reglas operativas razonables para el equipo de Interesante Compañía.

## Entregables

### 1. Documento interno `docs/POLITICA_USUARIOS.md`
Estructura propuesta:

- **Alcance**: a quién aplica (empleados, colaboradores externos, roster).
- **Registro y aprobación**:
  - El registro con email/password o Google está abierto, pero ninguna cuenta obtiene acceso hasta que un BIG C la apruebe.
  - Estado inicial de toda cuenta: `pending`.
  - Estados posibles: `pending`, `active`, `rejected`.
- **Roles y permisos**:
  - **BIG C (`admin`)**: acceso total, incluido el módulo económico y la gestión de usuarios (`/users`).
  - **TEAM (`team`)**: acceso a todo el back-office excepto el módulo económico y la gestión de usuarios.
  - **ROSTER (`composer`)**: acceso únicamente a su portal personal (`/me`).
- **Flujo de aprobación**:
  - Un BIG C revisa las solicitudes pendientes en `/users`.
  - Al aprobar se asigna un rol; al rechazar se marca como `rejected`.
  - Un usuario no puede quitarse a sí mismo el rol BIG C.
- **Seguridad de acceso**:
  - Contraseñas seguras y verificación contra fugas (HIBP).
  - Sesión gestionada por Lovable Cloud; cierre de sesión obligatorio al terminar en dispositivos compartidos.
- **Baja / offboarding**:
  - Cuando un usuario deja de pertenecer al equipo, un BIG C revoca el acceso cambiando su estado a `rejected`.
  - Recomendación: documentar quién del equipo realiza la baja y en qué plazo.
- **Acceso a datos de otros usuarios**:
  - Cada usuario ve solo lo que su rol le permite.
  - Los datos personales del roster solo son editables por el propio usuario o por BIG C según corresponda.

### 2. Referencias en el código
- Añadir un comentario en `src/lib/use-role.ts` y `src/lib/users-admin.functions.ts` que apunte a `docs/POLITICA_USUARIOS.md`.
- Revisar que los textos de la UI (`/pending`, `/users`, barra lateral) usen los nombres de roles y estados definidos en la política.

### 3. Opcional: activar HIBP
Si no está activo, configurar `password_hibp_enabled: true` para evitar contraseñas filtradas.

## Notas técnicas
- No se crean rutas públicas ni se modifica la base de datos: es documentación interna.
- El documento se escribe en español y se guarda en `docs/`.

## Criterio de aceptación
- Existe `docs/POLITICA_USUARIOS.md` con todas las secciones descritas.
- Los archivos de roles y gestión de usuarios contienen una referencia al documento.
- La app sigue compilando sin errores.