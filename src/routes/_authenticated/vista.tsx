import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Crown, Users, Music } from "lucide-react";
import { useCurrentRole } from "@/lib/use-role";
import { setSessionView, type SessionView } from "@/lib/session-view";

export const Route = createFileRoute("/_authenticated/vista")({
  component: VistaPicker,
});

function VistaPicker() {
  const nav = useNavigate();
  const { isBigC, status, loading } = useCurrentRole();

  useEffect(() => {
    if (loading) return;
    if (status === "pending" || status === "rejected") {
      window.location.replace("/pending");
      return;
    }
    if (!isBigC) {
      // Only BIG C selects a session view; others go to their default surface.
      window.location.replace("/");
    }
  }, [isBigC, status, loading]);

  if (loading || !isBigC) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-muted-foreground">
        Cargando…
      </div>
    );
  }

  function pick(view: SessionView) {
    setSessionView(view);
    if (view === "roster") nav({ to: "/portal" });
    else nav({ to: "/" });
  }

  const cards: { view: SessionView; title: string; hint: string; icon: typeof Users; desc: string }[] = [
    {
      view: "bigc",
      title: "BIG C",
      hint: "Vista completa",
      icon: Crown,
      desc: "Todo el árbol: económico, legal, marketing, agentes, calendarios. Sin restricciones.",
    },
    {
      view: "team",
      title: "TEAM",
      hint: "Como un miembro del equipo",
      icon: Users,
      desc: "Roster, partners, oportunidades, marketing, calendarios y legal operativo. Sin dashboard económico.",
    },
    {
      view: "roster",
      title: "ROSTER",
      hint: "Como un compositor",
      icon: Music,
      desc: "Portal del representado: proyectos, propuestas, agenda, contratos y chat con IC.",
    },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
      <header className="mb-10 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Sesión</p>
        <h1 className="mt-1 font-display text-5xl">¿Con qué vista quieres trabajar?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Elige la perspectiva de esta sesión para simplificar el árbol. Puedes cambiarla en cualquier momento desde la barra lateral.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.view}
            type="button"
            onClick={() => pick(c.view)}
            className="group flex flex-col items-start gap-3 rounded-sm border border-border p-6 text-left transition hover:border-primary/60 hover:bg-muted/40"
          >
            <c.icon className="h-8 w-8 text-muted-foreground transition group-hover:text-foreground" />
            <div>
              <p className="font-display text-2xl leading-tight">{c.title}</p>
              <p className="smallcaps text-[10px] text-muted-foreground">{c.hint}</p>
            </div>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}