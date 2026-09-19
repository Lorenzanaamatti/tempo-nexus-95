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
  Empresa: "Gobierno y números de la compañía",
  Clientes: "Roster y fichas de representados",
  Partners: "Productoras, plataformas, medios",
  "Oportunidades de ventas": "Todo lo que puede convertirse en trabajo",
  Producciones: "Trabajo en marcha y cerrado",
  Paperwork: "Presupuestos, deal memos, contratos",
  "Templates documentos": "Documentos base",
  Comunicación: "Identidad y publicaciones",
  Marketing: "Campañas y métricas",
  Calendario: "Agenda de la compañía",
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
        .eq("id", user!.id)
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
    { title: "Tareas", to: "/tareas", search: { filter: "hoy" } },
    { title: "Calendario", to: "/calendar", search: { view: "global" } },
  ];

  const economico: Door[] = [
    { title: "Dashboard económico", to: "/finance" },
    { title: "Plan de facturación", to: "/billing" },
    { title: "Presupuestos", to: "/paperwork/presupuestos" },
  ];

  const secciones: Door[] = NAV_GROUPS.filter(
    (g) => !["Recursos", "Departamentos", "Calendario"].includes(g.label) && (isBigC || !g.bigCOnly),
  ).map((g) => ({
    title: g.label,
    description: GROUP_HINT[g.label],
    to: g.items[0]!.to,
    search: g.items[0]!.search,
  }));

  function doorsOfGroup(label: string): Door[] {
    const group = NAV_GROUPS.find((g) => g.label === label);
    if (!group) return [];
    return group.items
      .filter((i) => isBigC || !i.bigCOnly)
      .map((i) => ({ title: i.title, to: i.to, search: i.search }));
  }

  const vistas: SessionView[] = isBigC ? ["bigc", "team", "roster"] : ["team"];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-6 py-14">
      <BrandLogo variant="auto" className="h-16 w-auto" />
      <p className="smallcaps mt-3 text-sm text-[color:var(--rust)]">Herramienta interna</p>
      <h1 className="mt-6 font-display text-5xl uppercase">Hola, {nombre}</h1>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {vistas.map((v) => {
          const active = effectiveView === v;
          return (
            <button
              key={v}
              type="button"
              disabled={!isBigC}
              onClick={() => setSessionView(v)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition ${
                active
                  ? "border-[color:var(--aubergine)] bg-[color:var(--aubergine)] text-primary-foreground"
                  : "border-border bg-card text-[color:var(--rust)] hover:border-[color:var(--rust)]"
              } ${isBigC ? "" : "cursor-default"}`}
            >
              Vista {SESSION_VIEW_LABEL[v]}
            </button>
          );
        })}
      </div>

      <Block title="Cómo tienes el día">
        <SectionDoors doors={dia} columns={2} />
      </Block>

      {isBigC && effectiveView === "bigc" && (
        <Block title="Datos económicos">
          <SectionDoors doors={economico} />
        </Block>
      )}

      <Block title="En qué vas a trabajar">
        <SectionDoors doors={secciones} />
      </Block>

      <Block title="Recursos">
        <SectionDoors doors={doorsOfGroup("Recursos")} />
      </Block>

      <Block title="Departamentos">
        <SectionDoors doors={doorsOfGroup("Departamentos")} />
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 w-full">
      <h2 className="mb-4 border-b border-[color:var(--rust)]/40 pb-2 text-center font-display text-2xl uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
