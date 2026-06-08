import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { formatDateEs } from "@/lib/dates";
import {
  FolderKanban,
  Inbox,
  CalendarDays,
  FileSignature,
  User,
  MessagesSquare,
  Sparkles,
  TrendingUp,
  Receipt,
  ArrowUpRight,
} from "lucide-react";

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
    <div className="space-y-10">
      {/* Hero */}
      <section className="portal-card overflow-hidden p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-[#ff6b6b]/40 via-[#c44569]/30 to-[#6c5ce7]/30 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-16 h-48 w-48 rounded-full bg-gradient-to-tr from-[#f7931e]/40 via-[#e85d3a]/30 to-transparent blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground/70 ring-1 ring-black/5">
            <Sparkles className="h-3 w-3" /> Tu espacio
          </span>
          <h2 className="mt-4 font-display text-5xl tracking-tight">
            Hola, <span className="bg-gradient-to-r from-[#e85d3a] via-[#c44569] to-[#6c5ce7] bg-clip-text text-transparent">{name}</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-foreground/70">
            Tu espacio privado en Interesante Compañía. Desde aquí gestionas tu carrera, proyectos, propuestas, contratos y la comunicación con el equipo.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Chip label="Estado" value={composer?.representation_status ?? "—"} tone="amber" />
            <Chip label="Tier" value={composer?.tier ?? "—"} tone="rose" />
            <Chip label="Renovación" value={formatDateEs(composer?.renewal_date) || "—"} tone="violet" />
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-display text-2xl">
            Resumen IC · <span className="text-foreground/50">{data?.kpis.year}</span>
          </h3>
          <Link to="/portal/kpis" className="inline-flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground">
            Ver detalle <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Producciones activas" value={String(data?.kpis.activeProds ?? 0)} icon={TrendingUp} gradient="from-[#ff6b6b] to-[#c44569]" />
          <Stat label="Facturación año" value={data ? fmt(data.kpis.facturacionYearProds) : "—"} icon={Receipt} gradient="from-[#f7931e] to-[#e85d3a]" />
          <Stat label="Propuestas abiertas" value={String(data?.kpis.openCands ?? 0)} icon={Inbox} gradient="from-[#6c5ce7] to-[#a78bfa]" />
          <Stat label="Contratos firmados" value={String(data?.kpis.signedContracts ?? 0)} icon={FileSignature} gradient="from-[#0d7a5f] to-[#2dd4a8]" />
        </div>
        <p className="mt-3 text-xs text-foreground/55">
          Total histórico: {data?.kpis.totalHist ?? 0} proyectos · facturación {data ? fmt(data.kpis.revenueHist) : "—"}.
        </p>
      </section>

      {/* Next milestone */}
      <section className="portal-card relative overflow-hidden p-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#e85d3a] via-[#c44569] to-[#6c5ce7]" />
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#c44569] to-[#6c5ce7] text-white shadow-lg shadow-[#c44569]/30">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="smallcaps text-[10px] text-foreground/60">Próximo hito</p>
            {data?.nextEvent ? (
              <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-display text-xl">{data.nextEvent.title || "Sin título"}</p>
                <span className="text-sm text-foreground/60">{formatDateEs(data.nextEvent.start_date)}</span>
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-foreground/60">No hay hitos próximos programados.</p>
            )}
          </div>
        </div>
      </section>

      {/* Quick access */}
      <section>
        <h3 className="mb-4 font-display text-2xl">Accesos rápidos</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Quick to="/portal/proyectos" title="Proyectos activos" desc="Lo que tienes en marcha ahora mismo." icon={FolderKanban} gradient="from-[#ff6b6b] to-[#c44569]" />
          <Quick to="/portal/propuestas" title="Propuestas en curso" desc="Oportunidades en negociación." icon={Inbox} gradient="from-[#f7931e] to-[#e85d3a]" />
          <Quick to="/portal/agenda" title="Agenda y reuniones" desc="Tus próximas citas y compromisos." icon={CalendarDays} gradient="from-[#6c5ce7] to-[#a78bfa]" />
          <Quick to="/portal/contratos" title="Contratos y derechos" desc="Documentación contractual." icon={FileSignature} gradient="from-[#0d7a5f] to-[#2dd4a8]" />
          <Quick to="/portal/carrera" title="Mi carrera" desc="Biografía, materiales y equipo IC." icon={User} gradient="from-[#c9a84c] to-[#f0d78c]" />
          <Quick to="/portal/chat" title="Chat con IC" desc="Conversación directa con tu equipo." icon={MessagesSquare} gradient="from-[#2e6b8a] to-[#5cbdb9]" />
        </div>
      </section>
    </div>
  );
}

const TONE: Record<string, string> = {
  amber: "from-[#fde68a]/60 to-[#fcd34d]/60 text-[#7c4a00]",
  rose: "from-[#fecdd3]/60 to-[#fda4af]/60 text-[#9f1239]",
  violet: "from-[#ddd6fe]/60 to-[#c4b5fd]/60 text-[#5b21b6]",
};

function Chip({ label, value, tone }: { label: string; value: string; tone: keyof typeof TONE }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${TONE[tone]} px-4 py-3 ring-1 ring-white/60`}>
      <p className="smallcaps text-[10px] opacity-70">{label}</p>
      <p className="mt-0.5 font-display text-lg">{value}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string;
  icon: typeof FolderKanban;
  gradient: string;
}) {
  return (
    <div className="portal-card p-5">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="smallcaps text-[10px] text-foreground/55">{label}</p>
      <p className="mt-1 font-display text-3xl tracking-tight">{value}</p>
    </div>
  );
}

function Quick({
  to,
  title,
  desc,
  icon: Icon,
  gradient,
}: {
  to: string;
  title: string;
  desc: string;
  icon: typeof FolderKanban;
  gradient: string;
}) {
  return (
    <Link
      to={to as string}
      className="portal-card portal-card-hover group block p-5"
    >
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md transition group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight">{title}</p>
          <p className="mt-1 text-sm text-foreground/60">{desc}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-foreground/30 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </Link>
  );
}