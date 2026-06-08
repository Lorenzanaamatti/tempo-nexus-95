import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { OPPORTUNITY_STATUS_LABEL, OPPORTUNITY_STATUS_TONE, type OpportunityStatus } from "@/lib/opportunity-constants";
import { formatEUR } from "@/lib/money";
import { formatDateEs } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/portal/propuestas")({
  component: Propuestas,
});

function Propuestas() {
  const { composerId } = usePortalComposer();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-propuestas", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("opportunity_candidates")
        .select("id, note, opportunity:opportunities(id, title, kind, statuses, probability_pct, estimated_value, detected_date, expected_close_date, last_contact_date, partner_company:production_companies(name), partner_name, target_production:productions(title, year), target_production_text)")
        .eq("composer_id", composerId!);
      return (data ?? []).filter((c: any) => c.opportunity);
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Propuestas en curso</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Oportunidades en las que IC te ha presentado como candidato.
        </p>
      </header>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sin propuestas activas por ahora.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((c: any) => {
            const o = c.opportunity;
            return (
              <li key={c.id} className="rounded-sm border border-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-lg">{o.title}</p>
                  <div className="flex flex-wrap gap-1">
                    {(o.statuses ?? []).map((s: OpportunityStatus) => (
                      <span key={s} className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${OPPORTUNITY_STATUS_TONE[s]}`}>
                        {OPPORTUNITY_STATUS_LABEL[s]}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[
                    o.partner_company?.name || o.partner_name,
                    o.kind === "pitch" ? (o.target_production?.title || o.target_production_text) : null,
                  ].filter(Boolean).join(" · ") || "—"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Mini label="Probabilidad" value={o.probability_pct != null ? `${o.probability_pct}%` : "—"} />
                  <Mini label="Valor estimado" value={o.estimated_value != null ? formatEUR(o.estimated_value) : "—"} />
                  <Mini label="Último contacto" value={formatDateEs(o.last_contact_date)} />
                  <Mini label="Cierre estimado" value={formatDateEs(o.expected_close_date)} />
                </div>
                {c.note && <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{c.note}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/30 px-2 py-1">
      <p className="smallcaps text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs tabular-nums">{value}</p>
    </div>
  );
}