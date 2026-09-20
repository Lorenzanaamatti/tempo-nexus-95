import { SectionDoors, type Door } from "@/components/section-doors";
import { NAV_GROUPS } from "@/lib/nav-tree";
import { useCurrentRole } from "@/lib/use-role";
import { useSessionView } from "@/lib/session-view";

const ITEM_DESCRIPTIONS: Record<string, string> = {
  "KPIs & Objetivos": "Consulta los indicadores de la compañía y el avance de sus objetivos.",
  "Dashboard económico": "Revisa ingresos, previsiones, costes y rentabilidad de la compañía.",
  "Plan de facturación": "Organiza importes, fechas y seguimiento de las facturas previstas.",
  "Equipo IC": "Consulta el equipo, sus funciones y la información interna.",
  "Filmografía IC": "Recorre los trabajos y créditos de la compañía.",
  "Agentes IA": "Accede a las herramientas de asistencia interna.",
  "Auditoría IA": "Revisa actividad, incidencias y controles de la herramienta.",
  "Roster completo": "Consulta todas las personas representadas y abre cada ficha.",
  Compositor: "Accede al roster de compositores y sus proyectos.",
  Artista: "Consulta artistas representados y su actividad.",
  Supervisor: "Consulta supervisores musicales y sus proyectos.",
  Especialista: "Encuentra perfiles por disciplina, experiencia y especialidad.",
  Curador: "Consulta music curators y sus trabajos.",
  "Productor musical": "Accede a productores musicales y sus fichas.",
  "Otros perfiles": "Consulta el resto de perfiles representados.",
  "Fichajes que queremos": "Consulta el talento detectado y el embudo de incorporación al roster.",
  Productoras: "Gestiona productoras, contactos y relaciones activas.",
  Plataformas: "Consulta plataformas y responsables de contacto.",
  Medios: "Organiza medios, contactos y seguimiento editorial.",
  Instituciones: "Consulta instituciones y relaciones profesionales.",
  "Actividad internacional": "Sigue relaciones, mercados y acciones fuera de España.",
  Subvenciones: "Consulta convocatorias, fechas y oportunidades de financiación.",
  Activas: "Abre las producciones que están actualmente en marcha.",
  Seguimiento: "Revisa el estado operativo y los próximos pasos de cada producción.",
  Gantt: "Consulta procesos, plazos, dependencias e hitos de producción.",
  Finalizadas: "Accede al archivo de producciones terminadas.",
  "Producciones españolas": "Consulta proyectos españoles detectados y sus datos clave.",
  Presupuestos: "Crea y consulta presupuestos vinculados a cada proyecto.",
  "Deal Memos": "Prepara y organiza acuerdos económicos de los proyectos.",
  Contratos: "Consulta contratos, firmas y documentación asociada.",
  Adendas: "Gestiona modificaciones y anexos contractuales.",
  "Contrato Laboral": "Accede a los modelos y documentos laborales.",
  "Contrato Proveedor": "Accede a contratos y documentación de proveedores.",
  Otros: "Guarda y consulta otros documentos administrativos.",
  "Identidad corporativa": "Encuentra logotipos y recursos de identidad de la compañía.",
  "Templates publicaciones": "Reutiliza formatos preparados para comunicación.",
  "Blog / Publicaciones": "Gestiona artículos, publicaciones y contenidos editoriales.",
  EPK: "Prepara y consulta materiales de presentación artística.",
  Reels: "Organiza piezas audiovisuales y materiales breves.",
  Clipping: "Reúne apariciones, referencias y cobertura publicada.",
  Festivales: "Consulta festivales, plazos y oportunidades relevantes.",
  Premios: "Sigue convocatorias, candidaturas y reconocimientos.",
  Prensa: "Gestiona medios, contactos y oportunidades de prensa.",
  "Documentos de venta": "Accede a presentaciones y materiales comerciales.",
  Campañas: "Planifica y consulta campañas activas.",
  Métricas: "Analiza resultados y evolución de las acciones de marketing.",
  Obligaciones: "Controla entregas y compromisos de comunicación.",
  Templates: "Accede a documentos y modelos preparados para reutilizar.",
  "Calendario general": "Consulta reuniones, entregas, hitos y fechas compartidas.",
  Tutoriales: "Abre las guías prácticas de los procesos internos.",
  BI: "Consulta paneles de análisis e inteligencia de negocio.",
  Auditoría: "Revisa actividad, incidencias y controles internos.",
  Financiero: "Entra en el área económica de la compañía.",
  Facturas: "Consulta el plan de facturación y sus vencimientos.",
  Personal: "Gestiona el equipo y la información interna.",
  CRM: "Trabaja con productoras, plataformas y otras relaciones profesionales.",
  Marketing: "Entra en campañas, métricas y obligaciones de comunicación.",
};

export function SectionLanding({
  eyebrow = "Sección",
  title,
  description,
  doors,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  doors: Door[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 max-w-3xl border-b border-border pb-7 sm:mb-10">
        <p className="font-mono text-xs font-bold uppercase text-rust">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl uppercase text-aubergine sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <SectionDoors doors={doors} wide />
    </div>
  );
}

export function GroupLanding({
  groupLabel,
  title = groupLabel,
  description,
}: {
  groupLabel: string;
  title?: string;
  description: string;
}) {
  const { isBigC } = useCurrentRole();
  const sessionView = useSessionView();
  const group = NAV_GROUPS.find((candidate) => candidate.label === groupLabel);
  const showBigCItems = isBigC && sessionView !== "team" && sessionView !== "roster";
  const doors: Door[] = (group?.items ?? [])
    .filter((item) => !item.bigCOnly || showBigCItems)
    .map((item) => ({
      title: item.title,
      description: ITEM_DESCRIPTIONS[item.title] ?? item.hint,
      to: item.to,
      search: item.search,
      icon: item.icon,
      markerClass: item.markerClass,
    }));

  return <SectionLanding title={title} description={description} doors={doors} />;
}