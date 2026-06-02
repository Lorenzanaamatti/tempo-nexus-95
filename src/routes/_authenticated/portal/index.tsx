import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const { composerId } = useCurrentRole();
  const { data } = useQuery({
    queryKey: ["portal-home", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("composers")
        .select("full_name, artistic_name, tier, representation_status, renewal_date")
        .eq("id", composerId!)
        .maybeSingle();
      return data;
    },
  });

  const name = data?.artistic_name || data?.full_name || "Bienvenido/a";

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
        <Card label="Estado" value={data?.representation_status ?? "—"} />
        <Card label="Tier" value={data?.tier ?? "—"} />
        <Card label="Renovación" value={data?.renewal_date ?? "—"} />
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