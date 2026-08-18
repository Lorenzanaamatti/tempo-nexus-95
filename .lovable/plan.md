# Objetivos de empresa: cuadro de KPIs completo

Hoy la pantalla solo permite fijar 5 objetivos (facturación, fichajes, reuniones nacionales, reuniones internacionales, inversión en marketing) y solo la facturación se compara de verdad contra el real. La app ya registra mucha más actividad medible: cobros, deal memos, pipeline, roster, prospección de fichaje, cuentas objetivo, internacional, producciones, oportunidades de subvenciones/festivales/premios/prensa, comunicación y marketing.

## Lista de KPIs propuesta (objetivo anual + real automático)

**Económico**
- Facturación anual (€) — ya existe
- Margen / comisión IC del año (€)
- Presupuestos (deal memos) enviados (nº)
- Presupuestos aceptados (nº)
- Tasa de aceptación de presupuestos (%)
- Días medios de cobro (objetivo máximo, nº días)

**Roster y fichajes**
- Fichajes cerrados (nº) — ya existe
- Prospects de fichaje contactados (nº)
- Reuniones con prospects de fichaje (nº)
- Representados con producción activa (nº)

**Comercial nacional**
- Cuentas objetivo contactadas (nº)
- Reuniones con partners nacionales (nº) — ya existe
- Clientes activos nuevos (nº)
- Oportunidades abiertas de producción (nº)
- Pitchs presentados: total (nº)
- Pitchs presentados de representados/composers (nº)
- Mínimo de pitchs por representado (nº) — objetivo por cabeza; el cuadro señala quién está por debajo
- Vínculos inter-IC (un representado da trabajo a otro) (nº)
- Artistas fichados (nº)
- Artistas contactados (nº)
- Nuevos potenciales aliados contactados (nº)

**Internacional**
- Prospects internacionales contactados (nº)
- Reuniones internacionales (nº) — ya existe
- Propuestas internacionales enviadas (nº)

**Producciones**
- Producciones finalizadas en el año (nº)
- Producciones nuevas iniciadas (nº)

**Convocatorias y visibilidad**
- Candidaturas / autocandidaturas presentadas (nº)
- Subvenciones solicitadas (nº)
- Festivales con presencia (nº)
- Premios / nominaciones (nº)
- Apariciones en prensa (nº)

**Comunicación y marketing**
- Inversión en marketing (€) — ya existe
- Publicaciones / posts publicados (nº)
- Campañas de marketing lanzadas (nº)
- Obligaciones de comunicación cumplidas (%)

Todos son valores anuales; cada uno muestra objetivo, real acumulado, % de cumplimiento y ritmo esperado a fecha de hoy.

## Cómo queda la pantalla

- Nueva sección "Objetivos {año}" al principio: tabla/grid por bloques con Objetivo · Real · % · barra de progreso · semáforo (verde si va por delante del ritmo del año, ámbar cerca, rojo por detrás).
- El diálogo "Establecer objetivos" pasa a ser un formulario por bloques (Económico, Roster, Comercial, Internacional, Producciones, Convocatorias, Comunicación) con scroll, unidades visibles (€, nº, %, días) y campos opcionales: los que se dejen vacíos no se muestran como objetivo.
- El resto del cuadro de mando actual se mantiene; solo se enriquecen las tarjetas que ahora tendrán objetivo asociado.

## Detalles técnicos

- `empresa_objetivos` ya es genérica (`anio`, `metrica`, `valor_objetivo`), así que no hace falta migración: solo ampliar `OBJETIVO_METRICAS` en `src/lib/kpi-constants.ts` con clave, etiqueta, unidad, grupo y dirección (mayor mejor / menor mejor).
- `src/lib/use-empresa-kpis.ts`: añadir consultas a `deal_memos`, `candidacies`, `oportunidades_subvenciones`, `oportunidades_festivales`, `oportunidades_premios`, `oportunidades_prensa`, `publicaciones` y `obligaciones_comunicacion`, y devolver un mapa `actuals[metrica] = valor` para que la sección de objetivos sea genérica.
- `src/routes/_authenticated/_admin/empresa.kpis.tsx`: nueva sección de objetivos y diálogo agrupado, reutilizando el componente `Goal` existente.
