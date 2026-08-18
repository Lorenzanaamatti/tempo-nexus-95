import { Link } from "@tanstack/react-router";
import { Money } from "@/components/money";
import { formatEUR0 } from "@/lib/money";
import { formatDateEs } from "@/lib/dates";

export function ComposerBilling({ productions, composerId }: { productions: any[]; composerId: string }) {
  const sprints = productions.flatMap((p) =>
    (p.billing_sprints ?? []).map((s: any) => ({ ...s, production_title: p.title, production_id: p.id })),
  );
  if (productions.length === 0) {
    return <p className="text-sm text-muted-foreground">Asigna al representado a una producción para ver su facturación.</p>;
  }
  if (sprints.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ninguna producción tiene sprints de facturación todavía. Crea sprints desde la ficha de cada producción.
        </p>
        <ProductionFeeSummary productions={productions} />
        <Link to="/finance" search={{ composerId }} className="inline-block text-xs underline text-muted-foreground hover:text-foreground">
          Abrir dashboard económico completo →
        </Link>
      </div>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  // Bruto = trabajo (lo que el representado factura). Comisión IC = lo que IC le descuenta.
  // Neto representado = bruto − comisión IC. Nunca sumar ambos como "previsto".
  const totals = sprints.reduce(
    (acc: any, s: any) => {
      const a = Number(s.amount) || 0;
      const bucket = s.kind === "comision" ? acc.comision : acc.trabajo;
      bucket.previsto += a;
      if (s.invoiced_date) bucket.fact += a;
      if (s.paid_date) bucket.cob += a;
      if (s.due_date && !s.invoiced_date && s.due_date < today) bucket.venc += a;
      return acc;
    },
    {
      trabajo: { previsto: 0, fact: 0, cob: 0, venc: 0 },
      comision: { previsto: 0, fact: 0, cob: 0, venc: 0 },
    },
  );
  const neto = {
    previsto: totals.trabajo.previsto - totals.comision.previsto,
    fact: totals.trabajo.fact - totals.comision.fact,
    cob: totals.trabajo.cob - totals.comision.cob,
  };
  sprints.sort((a: any, b: any) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-sm border border-primary/30 bg-card p-3">
          <div className="smallcaps text-xs text-muted-foreground">Bruto (lo que factura el representado)</div>
          <div className="mt-1 font-display text-2xl tabular-nums"><Money value={totals.trabajo.previsto} compact /></div>
          <div className="mt-1 text-xs text-muted-foreground">Facturado <Money value={totals.trabajo.fact} compact /> · Cobrado <Money value={totals.trabajo.cob} compact /></div>
        </div>
        <div className="rounded-sm border border-amber-500/40 bg-card p-3">
          <div className="smallcaps text-xs text-muted-foreground">− Comisión IC</div>
          <div className="mt-1 font-display text-2xl tabular-nums"><Money value={-totals.comision.previsto} compact /></div>
          <div className="mt-1 text-xs text-muted-foreground">Facturada <Money value={totals.comision.fact} compact /> · Cobrada <Money value={totals.comision.cob} compact /></div>
        </div>
        <div className="rounded-sm border border-emerald-500/40 bg-card p-3">
          <div className="smallcaps text-xs text-muted-foreground">Neto representado</div>
          <div className="mt-1 font-display text-2xl tabular-nums"><Money value={neto.previsto} compact /></div>
          <div className="mt-1 text-xs text-muted-foreground">Facturado <Money value={neto.fact} compact /> · Cobrado <Money value={neto.cob} compact /></div>
        </div>
      </div>
      {totals.trabajo.venc > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Vencido sin facturar (trabajo): <Money value={totals.trabajo.venc} compact />
        </p>
      )}
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Producción</th>
              <th className="px-3 py-2">Sprint</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2 text-right">Importe</th>
              <th className="px-3 py-2">Vencimiento</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Ref. Holded</th>
            </tr>
          </thead>
          <tbody>
            {sprints.map((s: any) => {
              const vencido = s.due_date && !s.invoiced_date && s.due_date < today;
              return (
                <tr key={s.id} className={`border-t border-border ${vencido ? "bg-amber-500/5" : ""}`}>
                  <td className="px-3 py-2">
                    <Link to="/productions/$productionId" params={{ productionId: s.production_id }} className="hover:underline">
                      {s.production_title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">#{s.sprint_number}{s.label ? ` · ${s.label}` : ""}</td>
                  <td className="px-3 py-2 text-xs">{s.kind === "comision" ? "Comisión IC" : s.kind === "trabajo" ? "Trabajo" : s.kind}</td>
                  <td className="px-3 py-2 text-right tabular-nums"><Money value={Number(s.amount ?? 0)} compact /></td>
                  <td className={`px-3 py-2 ${vencido ? "text-amber-600 dark:text-amber-400" : ""}`}>{formatDateEs(s.due_date)}</td>
                  <td className="px-3 py-2 text-xs">{s.status}</td>
                  <td className="px-3 py-2 text-xs">
                    {s.holded_url ? (
                      <a href={s.holded_url} target="_blank" rel="noreferrer" className="underline">
                        {s.holded_invoice_ref || "ver"}
                      </a>
                    ) : (
                      s.holded_invoice_ref || "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Link to="/finance" search={{ composerId }} className="inline-block text-xs underline text-muted-foreground hover:text-foreground">
        Abrir dashboard económico completo →
      </Link>
    </div>
  );
}

export function ProductionFeeSummary({ productions }: { productions: any[] }) {
  const withFee = productions.filter((p) => p.fee_amount != null || p.ic_commission != null);
  if (withFee.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {withFee.map((p) => (
        <li key={p.id}>
          <span className="text-foreground">{p.title}</span> · Fee <Money value={Number(p.fee_amount ?? 0)} compact /> · Comisión IC <Money value={Number(p.ic_commission ?? 0)} compact />
        </li>
      ))}
    </ul>
  );
}
