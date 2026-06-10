import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { formatDateEs } from "@/lib/dates";
import {
  FolderKanban,
  Inbox,
  CalendarDays,
  FileSignature,
  User,
  MessagesSquare,
  TrendingUp,
  Receipt,
  ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const { composerId } = usePortalComposer();
  const { data } = useQuery({
    queryKey: ["portal-home", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const year = new Date().getFullYear();
      const today = new Date().toISOString().slice(0, 10);
      const [composer, projects, productions, candidates, contracts, nextEvent] = await Promise.all([
        supabase
          .from("composers")
          .select("full_name, artistic_name, tier, representation_status, renewal_date")
          .eq("id", composerId!)
          .maybeSingle(),
        supabase
          .from("composer_projects")
          .select("id, production, year, price_charged, net_margin")
          .eq("composer_id", composerId!),
        (supabase as any)
          .from("productions")
          .select("id, status, year, fee_amount, ic_commission_pct")
          .eq("composer_id", composerId!),
        (supabase as any)
          .from("opportunity_candidates")
          .select("id, opportunity:opportunities(statuses)")
          .eq("composer_id", composerId!),
        (supabase as any)
          .from("contracts")
          .select("id, sign_status")
          .or(`composer_id.eq.${composerId},signer_composer_id.eq.${composerId}`),
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
      const prods = (productions.data ?? []) as any[];
      const yearProds = prods.filter((p) => p.year === year);
      const facturacionYearProds = yearProds.reduce((s, p) => s + Number(p.fee_amount ?? 0), 0);
      const ACTIVE = new Set(["compositor_confirmado","presupuesto_enviado","presupuesto_confirmado","contrato_enviado","contrato_negociacion","contrato_firmado","visuales_entregados","en_composicion","en_produccion","en_mezclas","entrega_parcial","entrega_total","entregables_completados"]);
      const activeProds = prods.filter((p) => ACTIVE.has(p.status)).length;
      const openCands = ((candidates.data ?? []) as any[]).filter((c) => {
        const s = (c.opportunity?.statuses ?? []) as string[];
        return !s.includes("cerrado") && !s.includes("descartado");
      }).length;
      const signedContracts = ((contracts.data ?? []) as any[]).filter((c) => c.sign_status === "firmado").length;
      return {
        composer: composer.data,
        kpis: {
          year,
          revenueHist: revenue,
          marginHist: margin,
          totalHist: all.length,
          facturacionYearProds,
          activeProds,
          totalProds: prods.length,
          openCands,
          signedContracts,
        },
        nextEvent,
      };
    },
  });

  const composer = data?.composer;
  const name = composer?.artistic_name || composer?.full_name || "Bienvenido/a";
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="border-t border-b border-[color:var(--portal-border)] py-10 sm:py-14">
        <p className="smallcaps text-[10px] text-[color:var(--accent-coral)]">Tu espacio</p>
        <h2 className="mt-4 font-display text-5xl font-light tracking-tight text-[color:var(--portal-fg)] sm:text-6xl">
          Hola, <span className="text-[color:var(--accent-coral)]">{name}</span>
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--portal-muted)]">
          Tu espacio privado en Interesante Compañía. Desde aquí gestionas tu carrera, proyectos, propuestas, contratos y la comunicación con el equipo.
        </p>
        <div className="mt-8 grid gap-px bg-[color:var(--portal-border)] sm:grid-cols-3">
          <Chip label="Estado" value={composer?.representation_status ?? "—"} />
          <Chip label="Tier" value={composer?.tier ?? "—"} />
          <Chip label="Renovación" value={formatDateEs(composer?.renewal_date) || "—"} />
        </div>
      </section>

      {/* KPIs */}
      <section>
        <div className="mb-5 flex items-baseline justify-between">
          <h3 className="smallcaps text-xs text-[color:var(--portal-fg)]">
            Resumen IC · <span className="text-[color:var(--portal-muted)]">{data?.kpis.year}</span>
          </h3>
          <Link to="/portal/kpis" className="inline-flex items-center gap-1 text-xs text-[color:var(--portal-muted)] transition hover:text-[color:var(--accent-coral)]">
            Ver detalle <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-px border border-[color:var(--portal-border)] bg-[color:var(--portal-border)] sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Producciones activas" value={String(data?.kpis.activeProds ?? 0)} icon={TrendingUp} />
          <Stat label="Facturación año" value={data ? fmt(data.kpis.facturacionYearProds) : "—"} icon={Receipt} />
          <Stat label="Propuestas abiertas" value={String(data?.kpis.openCands ?? 0)} icon={Inbox} />
          <Stat label="Contratos firmados" value={String(data?.kpis.signedContracts ?? 0)} icon={FileSignature} />
        </div>
        <p className="mt-3 text-xs text-[color:var(--portal-muted)]">
          Total histórico: {data?.kpis.totalHist ?? 0} proyectos · facturación {data ? fmt(data.kpis.revenueHist) : "—"}.
        </p>
      </section>

      {/* Next milestone */}
      <section className="relative flex items-stretch border border-[color:var(--portal-border)] bg-[color:var(--portal-surface)]">
        <div className="w-1 bg-[color:var(--accent-coral)]" />
        <div className="flex flex-1 items-center gap-5 p-6">
          <div className="grid h-12 w-12 shrink-0 place-items-center border border-[color:var(--portal-border)] text-[color:var(--portal-fg)]">
            <CalendarDays className="h-5 w-5" strokeWidth={1.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="smallcaps text-[10px] text-[color:var(--accent-coral)]">Próximo hito</p>
            {data?.nextEvent ? (
              <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-display text-2xl font-light text-[color:var(--portal-fg)]">{data.nextEvent.title || "Sin título"}</p>
                <span className="font-mono text-xs text-[color:var(--portal-muted)]">{formatDateEs(data.nextEvent.start_date)}</span>
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-[color:var(--portal-muted)]">No hay hitos próximos programados.</p>
            )}
          </div>
        </div>
      </section>

      {/* Quick access */}
      <section>
        <h3 className="mb-5 smallcaps text-xs text-[color:var(--portal-fg)]">Accesos rápidos</h3>
        <div className="grid gap-px border border-[color:var(--portal-border)] bg-[color:var(--portal-border)] sm:grid-cols-2 lg:grid-cols-3">
          <Quick to="/portal/proyectos" title="Proyectos activos" desc="Lo que tienes en marcha ahora mismo." icon={FolderKanban} />
          <Quick to="/portal/propuestas" title="Propuestas en curso" desc="Oportunidades en negociación." icon={Inbox} />
          <Quick to="/portal/agenda" title="Agenda y reuniones" desc="Tus próximas citas y compromisos." icon={CalendarDays} />
          <Quick to="/portal/contratos" title="Contratos y derechos" desc="Documentación contractual." icon={FileSignature} />
          <Quick to="/portal/carrera" title="Mi carrera" desc="Biografía, materiales y equipo IC." icon={User} />
          <Quick to="/portal/chat" title="Chat con IC" desc="Conversación directa con tu equipo." icon={MessagesSquare} />
        </div>
      </section>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--portal-bg)] px-5 py-4">
      <p className="smallcaps text-[10px] text-[color:var(--portal-muted)]">{label}</p>
      <p className="mt-1 font-display text-xl font-light text-[color:var(--portal-fg)]">{value}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof FolderKanban;
}) {
  return (
    <div className="bg-[color:var(--portal-surface)] p-5">
      <div className="mb-4 inline-flex h-9 w-9 items-center justify-center border border-[color:var(--portal-border)] text-[color:var(--portal-fg)]">
        <Icon className="h-4 w-4" strokeWidth={1.25} />
      </div>
      <p className="smallcaps text-[10px] text-[color:var(--portal-muted)]">{label}</p>
      <p className="mt-1 font-display text-4xl font-light tracking-tight text-[color:var(--portal-fg)]">{value}</p>
    </div>
  );
}

function Quick({
  to,
  title,
  desc,
  icon: Icon,
}: {
  to: string;
  title: string;
  desc: string;
  icon: typeof FolderKanban;
}) {
  return (
    <Link
      to={to as string}
      className="group relative block bg-[color:var(--portal-surface)] p-5 transition hover:bg-[color:var(--portal-surface-hover)]"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center border border-[color:var(--portal-border)] text-[color:var(--portal-fg)] transition group-hover:border-[color:var(--accent-coral)] group-hover:text-[color:var(--accent-coral)]">
          <Icon className="h-5 w-5" strokeWidth={1.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-light leading-tight text-[color:var(--portal-fg)]">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--portal-muted)]">{desc}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-[color:var(--portal-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[color:var(--accent-coral)]" strokeWidth={1.25} />
      </div>
    </Link>
  );
}