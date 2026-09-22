import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Money } from "@/components/money";
import { EmptyState } from "@/components/list-states";
import { ExportRowsButton } from "@/components/export-rows-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PRODUCTION_STATUS_LABEL } from "@/lib/production-constants";
import { stageOf, PRODUCTION_STAGE_LABEL } from "@/lib/production-lifecycle";

export const Route = createFileRoute("/_authenticated/_admin/comisiones-proyecto")({
  component: ComisionesPorProyecto,
  head: () => ({ meta: [
    { title: "Comisión por proyecto | Interesante Compañía" },
    { name: "description", content: "Cuánto se ha facturado y cuánto falta para completar la comisión IC de cada proyecto." },
    { property: "og:title", content: "Comisión por proyecto | Interesante Compañía" },
    { property: "og:description", content: "Progreso de facturación y cobro de la comisión IC en cada producción." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type Production = {
  id: string; title: string; status: string | null;
  fee_amount: number | null; ic_commission: number | null; ic_commission_pct: number | null;
  composers?: { full_name: string | null } | null;
};
type InvoiceRow = { production_id: string | null; amount: number | null; status: string };

function objetivo(p: Production) {
  const pactada = Number(p.ic_commission);
  if (Number.isFinite(pactada) && pactada > 0) return pactada;
  const fee = Number(p.fee_amount) || 0;
  const pct = Number(p.ic_commission_pct) || 0;
  return fee && pct ? (fee * pct) / 100 : 0;
}

function Bar({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div className="h-2 w-full bg-muted">
      <div className={`h-2 ${tone}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

function ComisionesPorProyecto() {
  const [search, setSearch] = useState("");
  const [incluirFinalizadas, setIncluirFinalizadas] = useState(false);

  const productionsQ = useQuery({
    queryKey: ["comisiones-productions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("productions")
        .select("id,title,status,fee_amount,ic_commission,ic_commission_pct,composers(full_name)")
        .order("title");
      if (error) throw error;
      return (data ?? []) as Production[];
    },
  });

  const invoicesQ = useQuery({
    queryKey: ["comisiones-invoices"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("billing_invoices")
        .select("production_id,amount,status");
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    },
  });

  const rows = useMemo(() => {
    const porProduccion = new Map<string, { facturado: number; cobrado: number }>();
    for (const i of invoicesQ.data ?? []) {
      if (!i.production_id || i.status === "anulada") continue;
      const amount = Number(i.amount) || 0;
      const acc = porProduccion.get(i.production_id) ?? { facturado: 0, cobrado: 0 };
      acc.facturado += amount;
      if (i.status === "cobrada") acc.cobrado += amount;
      porProduccion.set(i.production_id, acc);
    }
    const q = search.trim().toLowerCase();
    return (productionsQ.data ?? [])
      .map((p) => {
        const acc = porProduccion.get(p.id) ?? { facturado: 0, cobrado: 0 };
        const meta = objetivo(p);
        const pendiente = Math.max(0, meta - acc.facturado);
        return {
          p,
          stage: stageOf(p.status),
          meta,
          facturado: acc.facturado,
          cobrado: acc.cobrado,
          pendiente,
          pctFacturado: meta > 0 ? (acc.facturado / meta) * 100 : 0,
          pctCobrado: meta > 0 ? (acc.cobrado / meta) * 100 : 0,
        };
      })
      .filter((r) => (incluirFinalizadas || r.stage !== "finalizada"))
      .filter((r) => r.meta > 0 || r.facturado > 0)
      .filter((r) => !q || [r.p.title, r.p.composers?.full_name].filter(Boolean).join(" ").toLowerCase().includes(q))
      .sort((a, b) => b.pendiente - a.pendiente);
  }, [productionsQ.data, invoicesQ.data, search, incluirFinalizadas]);

  const totals = rows.reduce(
    (a, r) => ({ meta: a.meta + r.meta, facturado: a.facturado + r.facturado, cobrado: a.cobrado + r.cobrado, pendiente: a.pendiente + r.pendiente }),
    { meta: 0, facturado: 0, cobrado: 0, pendiente: 0 },
  );

  const exportRows = rows.map((r) => ({
    Proyecto: r.p.title,
    Compositor: r.p.composers?.full_name ?? "—",
    Estado: r.p.status ? (PRODUCTION_STATUS_LABEL as Record<string, string>)[r.p.status] ?? r.p.status : "—",
    ComisionIC: r.meta,
    Facturado: r.facturado,
    Cobrado: r.cobrado,
    Pendiente: r.pendiente,
    Progreso: `${Math.round(r.pctFacturado)} %`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comisión por proyecto"
        description="Cuánto se ha facturado de la comisión IC de cada proyecto y cuánto falta por facturar."
        actions={<ExportRowsButton rows={exportRows} filename="comision-por-proyecto" sheetName="Comisión IC" />}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Kpi label="Comisión pactada" value={<Money value={totals.meta} />} />
        <Kpi label="Facturado" value={<Money value={totals.facturado} />} />
        <Kpi label="Cobrado" value={<Money value={totals.cobrado} />} />
        <Kpi label="Falta por facturar" value={<Money value={totals.pendiente} />} />
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Input className="max-w-xs" placeholder="Buscar proyecto o compositor…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={incluirFinalizadas} onCheckedChange={(v) => setIncluirFinalizadas(!!v)} />
          Incluir también proyectos finalizados
        </label>
      </div>

      {productionsQ.isLoading || invoicesQ.isLoading ? (
        <div className="p-10 text-center">Cargando…</div>
      ) : rows.length === 0 ? (
        <EmptyState title="Sin proyectos con comisión" description="Añade la comisión IC en la ficha de una producción para verla aquí." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.p.id} className="border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <Link to="/productions/$productionId" params={{ productionId: r.p.id }} className="font-display text-lg text-primary hover:underline">
                    {r.p.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {r.p.composers?.full_name ?? "Sin compositor"} · {PRODUCTION_STAGE_LABEL[r.stage]}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-display text-xl"><Money value={r.facturado} /> <span className="text-muted-foreground">de</span> <Money value={r.meta} /></div>
                  <div className="text-muted-foreground">Falta por facturar: <Money value={r.pendiente} /></div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Facturado</span><span>{Math.round(r.pctFacturado)} %</span>
                  </div>
                  <Bar pct={r.pctFacturado} tone="bg-primary" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Cobrado <Money value={r.cobrado} /></span><span>{Math.round(r.pctCobrado)} %</span>
                  </div>
                  <Bar pct={r.pctCobrado} tone="bg-accent" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="border border-border p-4"><p className="smallcaps text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl">{value}</p></div>;
}
