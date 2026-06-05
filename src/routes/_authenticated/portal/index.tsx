import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { formatDateEs } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const { composerId } = useCurrentRole();
  const { data } = useQuery({
    queryKey: ["portal-home", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const year = new Date().getFullYear();
      const today = new Date().toISOString().slice(0, 10);
      const [composer, projects, nextEvent] = await Promise.all([
        supabase
          .from("composers")
          .select("full_name, artistic_name, tier, representation_status, renewal_date")
          .eq("id", composerId!)
          .maybeSingle(),
        supabase
          .from("composer_projects")
          .select("id, production, year, price_charged, net_margin")
          .eq("composer_id", composerId!),
        (async () => {
          const { data: person } = await supabase
            .from("people")
            .select("id")
            .eq("composer_id", composerId!)
            .maybeSingle();
          if (!person) return null;
          const { data: ev } = await supabase
            .from("calendar_events")
            .select("id, title, start_date, kind")
            .eq("subject_type", "person")
            .eq("subject_id", person.id)
            .gte("start_date", today)
            .order("start_date")
            .limit(1)
            .maybeSingle();
          return ev;
        })(),
      ]);
      const all = projects.data ?? [];
      const yearProjects = all.filter((p) => p.year === year);
      const revenue = yearProjects.reduce((s, p) => s + Number(p.price_charged ?? 0), 0);
      const margin = yearProjects.reduce((s, p) => s + Number(p.net_margin ?? 0), 0);
      return {
        composer: composer.data,
        kpis: { year, count: yearProjects.length, revenue, margin, total: all.length },
        nextEvent,
      };
    },
  });

  const composer = data?.composer;
  const name = composer?.artistic_name || composer?.full_name || "Bienvenido/a";
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-8">
      <section>
        <p className="smallcaps text-muted-foreground">Resumen</p>
        <h2 className="mt-1 font-display text-3xl">Hola, {name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Este es tu espacio privado en Interesante Compañía. Desde aquí gestionas tu carrera, proyectos, propuestas, contratos y comunicación con el equipo.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card label="Estado" value={composer?.representation_status ?? "—"} />
        <Card label="Tier" value={composer?.tier ?? "—"} />
        <Card label="Renovación" value={formatDateEs(composer?.renewal_date)} />
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl">KPIs del año {data?.kpis.year}</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <Card label="Proyectos del año" value={String(data?.kpis.count ?? 0)} />
          <Card label="Total histórico" value={String(data?.kpis.total ?? 0)} />
          <Card label="Facturación año" value={data ? fmt(data.kpis.revenue) : "—"} />
          <Card label="Margen neto año" value={data ? fmt(data.kpis.margin) : "—"} />
        </div>
      </section>

      <section className="rounded-sm border border-border bg-card/40 p-5">
        <p className="smallcaps text-xs text-muted-foreground">Próximo hito</p>
        {data?.nextEvent ? (
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <p className="font-display text-xl">{data.nextEvent.title || "Sin título"}</p>
            <span className="text-sm text-muted-foreground">{data.nextEvent.start_date}</span>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No hay hitos próximos programados.</p>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl">Accesos rápidos</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Quick to="/portal/proyectos" title="Proyectos activos" desc="Lo que tienes en marcha ahora mismo." />
          <Quick to="/portal/propuestas" title="Propuestas en curso" desc="Oportunidades en negociación." />
          <Quick to="/portal/agenda" title="Agenda y reuniones" desc="Tus próximas citas y compromisos." />
          <Quick to="/portal/contratos" title="Contratos y derechos" desc="Documentación contractual." />
          <Quick to="/portal/carrera" title="Mi carrera" desc="Tu ficha, biografía y materiales." />
          <Quick to="/portal/mensajes" title="Mensajes" desc="Actualizaciones del equipo IC." />
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <p className="smallcaps text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

function Quick({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to as string}
      className="block rounded-sm border border-border p-4 transition hover:border-primary/60"
    >
      <p className="font-display text-lg">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}