import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/portal/facturacion")({
  component: Facturacion,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

type Sprint = {
  id: string;
  production_id: string;
  kind: "trabajo" | "comision" | string;
  sprint_number: number;
  label: string | null;
  amount: number | null;
  due_date: string | null;
  invoiced_date: string | null;
  paid_date: string | null;
  status: string;
  notes: string | null;
  production?: { title: string | null } | null;
};

function Facturacion() {
  const { composerId } = useCurrentRole();
  const [tab, setTab] = useState<"resumen" | "emitidas" | "cobros" | "ic" | "costes" | "calendario">("resumen");

  const { data, isLoading } = useQuery({
    queryKey: ["portal-facturacion", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data: prods } = await supabase
        .from("productions")
        .select("id, title, year")
        .eq("composer_id", composerId!);
      const productionIds = (prods ?? []).map((p) => p.id);
      const prodMap = new Map((prods ?? []).map((p) => [p.id, p]));
      let sprints: Sprint[] = [];
      if (productionIds.length) {
        const { data: s } = await supabase
          .from("production_billing_sprints")
          .select("id, production_id, kind, sprint_number, label, amount, due_date, invoiced_date, paid_date, status, notes")
          .in("production_id", productionIds)
          .order("due_date", { ascending: true, nullsFirst: false });
        sprints = (s ?? []).map((x) => ({ ...x, production: prodMap.get(x.production_id) ?? null })) as Sprint[];
      }
      const { data: projects } = await supabase
        .from("composer_projects")
        .select("id, production, year, price_charged, production_cost, agency_commission, composer_profit, net_margin")
        .eq("composer_id", composerId!);
      return { sprints, projects: projects ?? [] };
    },
  });

  const totals = useMemo(() => {
    const s = data?.sprints ?? [];
    const work = s.filter((x) => x.kind === "trabajo");
    const ic = s.filter((x) => x.kind === "comision");
    const sum = (arr: Sprint[]) => arr.reduce((acc, x) => acc + Number(x.amount ?? 0), 0);
    const sumWhere = (arr: Sprint[], f: (x: Sprint) => boolean) => sum(arr.filter(f));
    return {
      issued: sumWhere(work, (x) => !!x.invoiced_date),
      pendingIssue: sumWhere(work, (x) => !x.invoiced_date),
      paid: sumWhere(work, (x) => !!x.paid_date),
      pendingPay: sumWhere(work, (x) => !!x.invoiced_date && !x.paid_date),
      icIssued: sumWhere(ic, (x) => !!x.invoiced_date),
      icPending: sumWhere(ic, (x) => !x.invoiced_date),
      historicRevenue: (data?.projects ?? []).reduce((acc, p) => acc + Number(p.price_charged ?? 0), 0),
      historicCost: (data?.projects ?? []).reduce((acc, p) => acc + Number(p.production_cost ?? 0), 0),
      historicCommission: (data?.projects ?? []).reduce((acc, p) => acc + Number(p.agency_commission ?? 0), 0),
      historicProfit: (data?.projects ?? []).reduce((acc, p) => acc + Number(p.composer_profit ?? 0), 0),
    };
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  const sprints = data?.sprints ?? [];
  const work = sprints.filter((x) => x.kind === "trabajo");
  const ic = sprints.filter((x) => x.kind === "comision");

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Facturación</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Estado completo de tus facturas, cobros, comisiones de IC y costes por producción.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {([
          ["resumen", "Resumen"],
          ["emitidas", "Emitidas / pendientes"],
          ["cobros", "Cobradas / pendientes cobro"],
          ["ic", "Comisiones IC"],
          ["costes", "Costes por producción"],
          ["calendario", "Calendario"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`border-b-2 px-3 py-2 text-sm transition ${
              tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "resumen" && (
        <div className="space-y-6">
          <section>
            <h3 className="mb-3 font-display text-xl">Facturación desde el inicio</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card label="Facturación histórica" value={fmt(totals.historicRevenue)} />
              <Card label="Coste producción" value={fmt(totals.historicCost)} />
              <Card label="Comisión IC" value={fmt(totals.historicCommission)} />
              <Card label="Beneficio compositor" value={fmt(totals.historicProfit)} />
            </div>
          </section>
          <section>
            <h3 className="mb-3 font-display text-xl">Sprints abiertos</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card label="Emitidas (trabajo)" value={fmt(totals.issued)} />
              <Card label="Pendientes de emitir" value={fmt(totals.pendingIssue)} />
              <Card label="Cobradas" value={fmt(totals.paid)} />
              <Card label="Pendientes de cobro" value={fmt(totals.pendingPay)} />
              <Card label="IC emitidas" value={fmt(totals.icIssued)} />
              <Card label="IC pendientes" value={fmt(totals.icPending)} />
            </div>
          </section>
        </div>
      )}

      {tab === "emitidas" && (
        <SprintTable
          rows={work}
          columns={["Producción", "Sprint", "Importe", "Vencimiento", "Emitida", "Estado"]}
          render={(s) => [
            s.production?.title ?? "—",
            `${s.sprint_number}${s.label ? " · " + s.label : ""}`,
            fmt(Number(s.amount ?? 0)),
            s.due_date ?? "—",
            s.invoiced_date ?? <Pending key="p">Pendiente</Pending>,
            <Status key="s" value={s.invoiced_date ? "Emitida" : "Pendiente"} ok={!!s.invoiced_date} />,
          ]}
        />
      )}

      {tab === "cobros" && (
        <SprintTable
          rows={work.filter((x) => x.invoiced_date)}
          columns={["Producción", "Sprint", "Importe", "Emitida", "Cobrada", "Estado"]}
          render={(s) => [
            s.production?.title ?? "—",
            `${s.sprint_number}${s.label ? " · " + s.label : ""}`,
            fmt(Number(s.amount ?? 0)),
            s.invoiced_date ?? "—",
            s.paid_date ?? <Pending key="p">Pendiente</Pending>,
            <Status key="s" value={s.paid_date ? "Cobrada" : "Pendiente cobro"} ok={!!s.paid_date} />,
          ]}
        />
      )}

      {tab === "ic" && (
        <SprintTable
          rows={ic}
          columns={["Producción", "Sprint", "Importe", "Vencimiento", "Emitida", "Cobrada"]}
          render={(s) => [
            s.production?.title ?? "—",
            `${s.sprint_number}${s.label ? " · " + s.label : ""}`,
            fmt(Number(s.amount ?? 0)),
            s.due_date ?? "—",
            s.invoiced_date ?? <Pending key="p">Pendiente</Pending>,
            s.paid_date ?? <Pending key="c">Pendiente</Pending>,
          ]}
        />
      )}

      {tab === "costes" && (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Producción</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Año</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Facturado</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Coste prod.</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Comisión IC</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Beneficio</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Margen</th>
              </tr>
            </thead>
            <tbody>
              {!data?.projects.length ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Sin datos.</td></tr>
              ) : data.projects.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2 font-display">{p.production}</td>
                  <td className="px-3 py-2">{p.year ?? "—"}</td>
                  <td className="px-3 py-2">{fmt(Number(p.price_charged ?? 0))}</td>
                  <td className="px-3 py-2">{fmt(Number(p.production_cost ?? 0))}</td>
                  <td className="px-3 py-2">{fmt(Number(p.agency_commission ?? 0))}</td>
                  <td className="px-3 py-2">{fmt(Number(p.composer_profit ?? 0))}</td>
                  <td className="px-3 py-2">{fmt(Number(p.net_margin ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "calendario" && (
        <CalendarView sprints={sprints} />
      )}
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

function Pending({ children }: { children: React.ReactNode }) {
  return <span className="rounded-sm bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">{children}</span>;
}
function Status({ value, ok }: { value: string; ok: boolean }) {
  return (
    <span className={`rounded-sm px-2 py-0.5 text-xs ${ok ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{value}</span>
  );
}

function SprintTable({
  rows,
  columns,
  render,
}: {
  rows: Sprint[];
  columns: string[];
  render: (s: Sprint) => React.ReactNode[];
}) {
  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-left">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 smallcaps text-xs text-muted-foreground">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">Sin movimientos.</td></tr>
          ) : rows.map((s) => (
            <tr key={s.id} className="border-t border-border">
              {render(s).map((cell, i) => (
                <td key={i} className="px-3 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({ sprints }: { sprints: Sprint[] }) {
  const today = new Date().toISOString().slice(0, 10);
  type Item = { date: string; label: string; type: "vencimiento" | "cobro" | "ic"; amount: number; production: string };
  const items: Item[] = [];
  for (const s of sprints) {
    const prod = s.production?.title ?? "—";
    if (s.due_date && !s.invoiced_date) {
      items.push({ date: s.due_date, label: s.kind === "comision" ? "Vencimiento IC" : "Vencimiento factura", type: s.kind === "comision" ? "ic" : "vencimiento", amount: Number(s.amount ?? 0), production: prod });
    }
    if (s.invoiced_date && !s.paid_date) {
      items.push({ date: s.invoiced_date, label: "Pendiente de cobro", type: "cobro", amount: Number(s.amount ?? 0), production: prod });
    }
  }
  const upcoming = items.filter((i) => i.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = items.filter((i) => i.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const Section = ({ title, list }: { title: string; list: Item[] }) => (
    <section className="space-y-3">
      <h3 className="font-display text-xl">{title}</h3>
      {!list.length ? (
        <p className="text-sm text-muted-foreground">Sin movimientos.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((i, idx) => (
            <li key={idx} className="flex items-baseline justify-between gap-4 rounded-sm border border-border p-3">
              <div>
                <p className="font-display">{i.production}</p>
                <p className="text-xs text-muted-foreground">{i.label} · {i.date}</p>
              </div>
              <span className="font-display">{fmt(i.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      <Section title="Próximos vencimientos y cobros" list={upcoming} />
      <Section title="Histórico" list={past} />
    </div>
  );
}