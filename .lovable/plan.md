## Objetivo

Añadir tipología a las cuentas objetivo (Roster / Productora / Plataforma / Otros), permitir filtrar por tipología en el índice y mostrar contadores por tipología y por estado.

## 1. Base de datos (migración)

Añadir a `public.target_accounts`:
- `account_type text not null default 'productora'` con CHECK en `('roster','productora','plataforma','otros')`.
- `roster_kind text` (subtipo cuando `account_type = 'roster'`: `composer`, `artista`, `productor_musical`, `otros`).
- `other_label text` (etiqueta libre cuando `account_type = 'otros'`).

Índice: `create index on public.target_accounts (account_type);`

Sin cambios de RLS ni de GRANTs (la tabla ya los tiene).

## 2. Categorías dinámicas de "Otros"

Regla: si un mismo `other_label` (normalizado en minúsculas y `trim`) aparece **2 o más veces**, se convierte en categoría reutilizable en el desplegable.

Implementación: en cliente, al abrir el `<Select>` de "Otros → categoría", se consulta `target_accounts` agrupando por `other_label` con `count >= 2` y se ofrecen como sugerencias, además de permitir escribir uno nuevo (`SuggestInput`, ya existente en el proyecto).

Sin tabla nueva — la agrupación se calcula desde los propios registros.

## 3. Constantes (`src/lib/target-accounts-constants.ts`)

Añadir:
- `TARGET_ACCOUNT_TYPES = ['roster','productora','plataforma','otros']` con labels y tonos.
- `TARGET_ACCOUNT_ROSTER_KINDS = ['composer','artista','productor_musical','otros']` con labels.

## 4. Detalle (`marketing.target-accounts.$accountId.tsx`)

- Nuevo campo `Tipología` (Select con los 4 tipos).
- Si `roster`: mostrar Select `Tipo de roster`.
- Si `otros`: mostrar `SuggestInput` con las categorías reutilizadas (>=2 usos) + texto libre.
- Persistir `account_type`, `roster_kind`, `other_label` en el `update`.

## 5. Índice (`marketing.target-accounts.index.tsx`)

- Nuevo filtro `Tipología` (Select: Todas / Roster / Productora / Plataforma / Otros).
- Barra de **contadores por tipología** encima del pipeline (chips clicables que activan el filtro).
- Barra de **contadores por estado** (chips clicables que activan el filtro de estado existente).
- Ambas barras muestran totales calculados sobre los datos actuales (respetando el resto de filtros/búsqueda salvo el propio).
- La tarjeta de cuenta muestra un pequeño badge de tipología (con `roster_kind` u `other_label` cuando aplique).
- Al crear una cuenta desde el input rápido, por defecto queda como `productora` (tipología editable en el detalle).

## 6. Fuera de alcance

- No se tocan calendario, triggers, oportunidades, RLS ni permisos.
- No se añade tabla independiente de "categorías Otros" — se derivan por conteo.

## Detalles técnicos

- Los tipos generados de Supabase se regenerarán tras la migración; hasta entonces se sigue usando el cast `(supabase as any)` que ya está presente en estos ficheros.
- Los contadores se calculan en memoria a partir del `useQuery` ya existente (sin llamadas extra).
