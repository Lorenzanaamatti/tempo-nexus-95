
# Reorganización en 6 ejes + transversales

## Estado actual del sidebar

Tres grupos: **Roster** (7 entradas) · **Gestión** (10 entradas, mezcla producciones, oportunidades, contratos, financiero, partners y calendario) · **Marketing y Ventas** (9 entradas).

Total: 26 entradas planas, mezclando ejes (qué) con vistas (cómo) y entidades de soporte.

## Estado objetivo

```
SIDEBAR (6 ejes):
  ROSTER          → ya existe
  PARTNERS        → unifica Productoras + Plataformas + Directores + Cuentas objetivo
  OPORTUNIDADES   → embudo, vive ya
  ECONÓMICO       → Contratos económicos + Deal memos + Facturación IC + Finance
  LEGAL           → Contratos jurídicos + plantillas + documentos legales + plazos
  MKTG            → Decks, clipping, EPK, libro estilo, case studies, plantillas, social, calendario MKTG

CHROME (barra superior, transversales):
  🗓 Calendarios (vista global multi-categoría)
  👥 Equipo IC
  🔎 Buscador global
```

## Fases (incrementales, cada una desplegable sin romper la anterior)

### Fase 1 — Reordenar sidebar SIN tocar datos

Reorganizo `src/components/app-sidebar.tsx` con los 6 grupos nuevos apuntando a las rutas que ya existen. Lo que aún no existe (Partners unificado, Legal) se rellena con submenú a las rutas actuales.

Mapa provisional de rutas existentes → ejes nuevos:

```
ROSTER:        /roster, /composers?role=*
PARTNERS:      /production-companies, /platforms, /directors, /marketing/target-accounts
OPORTUNIDADES: /opportunities
ECONÓMICO:     /finance, /budget, /billing, /deal-memos
LEGAL:         /contracts, /deal-memos/plantillas, /deal-memos/contactos
MKTG:          /marketing/* (excepto target-accounts, que pasa a PARTNERS)
TRANSVERSAL:   /calendar (sale del sidebar, va al header)
```

`Deal memos` aparece en Económico y Legal en esta fase: el listado/kanban en Económico (es lo que opera el dinero), las plantillas y contactos en Legal. Si esto te chirría lo discutimos antes.

Mover el trigger de Calendario al header de `src/routes/_authenticated.tsx` (al lado de "Equipo IC" actual).

**Riesgo:** ninguno funcional, solo cambia el menú.

### Fase 2 — Hub PARTNERS (vista unificada, sin migrar tablas)

Nueva ruta `/partners` que actúa como índice cruzado de productoras + plataformas + directores + target accounts, con filtro por `kind` (productora / plataforma / agencia / marca / festival / institución / manager / director). Las tablas siguen separadas; el hub solo agrega lecturas.

Las rutas individuales (`/production-companies`, `/platforms`, `/directors`) siguen funcionando — son las fichas detalladas.

**Riesgo:** bajo. Solo nuevas vistas de lectura.

### Fase 3 — Hub LEGAL y reorganización de contratos / deal memos

- Nueva ruta `/legal` con índice de: contratos firmados, plantillas DM, contactos DM, vencimientos próximos (preavisos / renovaciones / expiraciones), documentos legales por partner.
- Calendario LEGAL como categoría dentro del calendario global (no como vista propia).
- Económico se queda con: Finance, Budget, Billing, listado de Deal memos en kanban, sprints, comisiones, P&L.

**Riesgo:** bajo. No mueve datos, solo crea vistas y mueve etiquetas.

### Fase 4 — Modelo unificado de Partners (migración de datos, opcional)

**Solo si tras vivir un tiempo con la Fase 2 confirmas que merece la pena.**

Crear tabla `partners` con `kind` enum (productora, plataforma, agencia, marca, festival, institución, manager, director, otro) y migrar:
- `production_companies` → `partners` kind=productora
- `platforms` → `partners` kind=plataforma
- `directors` → `partners` kind=director
- `target_accounts` queda como tabla de **estado del embudo** apuntando a `partner_id`

Mantener vistas de compatibilidad (`directors_view`, `production_companies_view`) para que las queries existentes no rompan.

**Riesgo:** alto. Es la única fase que toca BBDD. No se hace hasta validar 1-3.

## Lo que NO cambia en ninguna fase

- Esquema actual de roster (`composers` + `roster_role`).
- Portal del representado.
- Esquema de calendar_events (sigue siendo transversal alimentado por triggers).
- Permisos / RLS.
- Equipo IC sigue siendo `ic_team` (atajo en header en vez de eje).

## Detalles técnicos

- **Sidebar**: editar `src/components/app-sidebar.tsx`, mantener `useSidebar` y `collapsible="icon"`, conservar la lógica de `composersRole` para el subgrupo Roster.
- **Header transversal**: editar `src/routes/_authenticated.tsx`, añadir iconos de Calendarios (link a `/calendar`) y Equipo IC (link a `/people` o equivalente). Buscador global se deja pendiente (es un proyecto en sí mismo).
- **Hub Partners (Fase 2)**: nuevo archivo `src/routes/_authenticated/_admin/partners.index.tsx` que hace 4 queries paralelas y muestra tabs por `kind`.
- **Hub Legal (Fase 3)**: nuevo archivo `src/routes/_authenticated/_admin/legal.index.tsx`.
- **Migración Fase 4**: tabla `partners`, enum `partner_kind`, GRANTs explícitos, vistas de compatibilidad, migración de FKs (`productions.production_company_id` → `productions.partner_id`).

## Qué decisión necesito antes de empezar

1. ¿Apruebas el reparto de **Deal memos** entre Económico (kanban / importes) y Legal (plantillas / contactos)?
2. ¿Hago la Fase 1 ahora (solo sidebar + header) y paramos a revisar antes de Fase 2-3?
3. La Fase 4 (migrar tablas a `partners`) ¿la dejamos como objetivo a 2-3 semanas vista?

