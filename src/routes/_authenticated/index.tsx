import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentRole } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { NAV_GROUPS } from "@/lib/nav-tree";
import { SectionDoors, type Door } from "@/components/section-doors";
import { setSessionView, useSessionView, SESSION_VIEW_LABEL, type SessionView } from "@/lib/session-view";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/")({
  component: Bienvenida,
  head: () => ({
    meta: [
      { title: "Bienvenida · IC APP" },
      { name: "description", content: "Portada de la herramienta interna de Interesante Compañía." },
      { property: "og:title", content: "Bienvenida · IC APP" },
      { property: "og:description", content: "Portada de la herramienta interna de Interesante Compañía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const GROUP_HINT: Record<string, string> = {
  Empresa: "Objetivos, equipo, actividad y visión económica de la compañía.",
  Clientes: "Consulta el roster completo y las fichas de cada especialidad.",
  Partners: "Gestiona productoras, plataformas, medios e instituciones.",
  "Oportunidades de ventas": "Sigue producciones, contactos, pitches y posibles fichajes.",
  Producciones: "Controla el trabajo activo, su evolución y los proyectos finalizados.",
  Paperwork: "Prepara presupuestos, acuerdos, contratos y documentación legal.",
  "Templates documentos": "Encuentra y reutiliza los documentos base de la compañía.",
  Comunicación: "Coordina identidad, contenidos, prensa y materiales de venta.",
  Marketing: "Planifica campañas, consulta métricas y controla obligaciones.",
  Calendario: "Consulta la agenda compartida de la compañía.",
};

const ITEM_HINT: Record<string, string> = {
  "Dashboard económico": "Visión global de ingresos, previsiones, costes y rentabilidad.",
  "Plan de facturación": "Organiza importes, fechas y seguimiento de las facturas previstas.",
  Presupuestos: "Crea, consulta y organiza presupuestos vinculados a cada proyecto.",
  Templates: "Accede a documentos y modelos preparados para reutilizar.",
  "Calendario general": "Consulta reuniones, entregas, hitos y fechas compartidas.",
  Tutoriales: "Guías prácticas para trabajar con los procesos de la compañía.",
  BI: "Paneles de análisis e inteligencia de negocio en preparación.",
  "Agentes IA": "Configura y consulta las herramientas de asistencia interna.",
  Auditoría: "Revisa actividad, incidencias y controles de la herramienta.",
  Financiero: "Accede al cuadro económico y al seguimiento financiero.",
  Facturas: "Consulta el plan de facturación y sus próximos vencimientos.",
  Personal: "Gestiona el equipo, sus funciones y la información interna.",
  CRM: "Trabaja con productoras, plataformas y demás relaciones profesionales.",
  Marketing: "Entra en campañas, métricas y obligaciones de comunicación.",
};

function Bienvenida() {
  const { user } = useAuth();
  const { role, status, isStaff, isBigC, loading } = useCurrentRole();
  const sessionView = useSessionView();

  useEffect(() => {
    if (loading) return;
    if (status === "pending" || status === "rejected") {
      window.location.replace("/pending");
      return;
    }
    if (!isStaff) window.location.replace("/me");
  }, [role, status, isStaff, loading]);

  const { data: profile } = useQuery({
    queryKey: ["profile-name", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user?.id ?? "")
        .maybeSingle();
      return data;
    },
  });

  if (loading || !isStaff || status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-muted-foreground">
        Abriendo el archivo…
      </div>
    );
  }

  const nombre =
    profile?.display_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "hola";

  const effectiveView: SessionView = isBigC ? sessionView ?? "bigc" : "team";

  const dia: Door[] = [
    { title: "Mis tareas", description: "Revisa lo que necesita tu atención y organiza las prioridades de hoy.", to: "/tareas", search: { filter: "hoy" } },
    { title: "Calendario", description: "Consulta reuniones, entregas y próximos hitos de la agenda compartida.", to: "/calendar", search: { view: "global" } },
  ];

  const economico: Door[] = [
    { title: "Económico IC", description: "Dashboard económico, plan de facturación y presupuestos en un único acceso.", to: "/economico-ic" },
  ];

  const secciones: Door[] = NAV_GROUPS.filter(
    (g) => !["Recursos", "Departamentos", "Calendario"].includes(g.label) && (isBigC || !g.bigCOnly),
  ).map((g) => ({
    title: g.label,
    description: GROUP_HINT[g.label],
    to: g.landingTo ?? g.items[0]?.to,
    search: g.landingTo ? undefined : g.items[0]?.search,
    icon: g.icon,
  }));

  function doorsOfGroup(label: string): Door[] {
    const group = NAV_GROUPS.find((g) => g.label === label);
    if (!group) return [];
    return group.items
      .filter((i) => isBigC || !i.bigCOnly)
      .map((i) => ({ title: i.title, description: ITEM_HINT[i.title] ?? i.hint, to: i.to, search: i.search, icon: i.icon }));
  }

  const vistas: SessionView[] = isBigC ? ["bigc", "team", "roster"] : ["team"];

  return (
    <main className="min-h-screen w-full overflow-hidden bg-background">
      <div className="h-1.5 w-full bg-primary" />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-6 pt-8 sm:px-8 sm:pb-8 lg:px-12">
          <BrandLogo variant="noir" className="h-36 w-auto max-w-full object-contain sm:h-48 lg:h-56" />
          <p className="mt-4 text-center font-mono text-base font-bold uppercase tracking-[0.18em] text-rust sm:text-lg">Herramienta de gestión y consulta</p>
          <div className="mt-6 flex w-full flex-col items-center justify-between gap-4 border-t border-border pt-5 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bienvenida</p>
              <h1 className="mt-1 font-display text-4xl uppercase leading-[0.95] text-aubergine sm:text-6xl">Hola, {nombre}</h1>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-end">
              <span className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vista de trabajo</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
        {vistas.map((v) => {
          const active = effectiveView === v;
          return (
            <Button
              key={v}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              disabled={!isBigC}
              onClick={() => setSessionView(v)}
              className={`rounded-full px-5 text-sm font-bold uppercase tracking-[0.08em] ${active ? "" : "text-aubergine hover:border-rust hover:bg-accent"} ${isBigC ? "" : "cursor-default"}`}
            >
              Vista {SESSION_VIEW_LABEL[v]}
            </Button>
          );
        })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <Block title="Cómo tienes el día" eyebrow="Tu jornada" description="Empieza por lo inmediato: prioridades, reuniones y fechas que requieren atención." tone="avocado" columns="side">
        <SectionDoors doors={dia} columns={2} wide />
      </Block>

      {isBigC && effectiveView === "bigc" && (
        <Block title="Datos económicos" eyebrow="Dirección" description="Una entrada directa a la situación económica y a la planificación de ingresos." tone="paper" columns="side">
          <SectionDoors doors={economico} columns={2} wide />
        </Block>
      )}

      <Block title="En qué vas a trabajar" eyebrow="Áreas de trabajo" description="Toda la actividad de la compañía, organizada para entrar directamente en cada área." tone="plain">
        <SectionDoors doors={secciones} wide />
      </Block>

      <Block title="Recursos" eyebrow="Biblioteca y apoyo" description="Documentos, agenda compartida, aprendizaje y herramientas internas." tone="rust">
        <SectionDoors doors={doorsOfGroup("Recursos")} wide />
      </Block>

      <Block title="Departamentos" eyebrow="Accesos directos" description="Entra en las áreas operativas que forman parte de tu trabajo cotidiano." tone="paper">
        <SectionDoors doors={doorsOfGroup("Departamentos")} wide />
      </Block>
      <footer className="border-t border-border px-6 py-8 text-center font-mono text-xs uppercase text-muted-foreground">
        Interesante Compañía · Herramienta interna
      </footer>
    </main>
  );
}

function Block({
  title,
  eyebrow,
  description,
  tone,
  columns = "stacked",
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  tone: "plain" | "paper" | "avocado" | "rust";
  columns?: "stacked" | "side";
  children: React.ReactNode;
}) {
  const toneClass = {
    plain: "bg-background",
    paper: "bg-card",
    avocado: "bg-avocado-soft",
    rust: "bg-accent",
  }[tone];
  return (
    <section className={`w-full border-b border-border ${toneClass}`}>
      <div className={`mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12 ${columns === "side" ? "lg:grid lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.9fr)] lg:items-start lg:gap-12" : ""}`}>
        <div className={columns === "side" ? "mb-5 lg:mb-0 lg:pt-1" : "mb-5 flex max-w-3xl flex-col"}>
          <p className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-rust">{eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl uppercase leading-[0.95] text-aubergine sm:text-4xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}
