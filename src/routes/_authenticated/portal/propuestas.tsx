import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { EmptyState } from "@/components/list-states";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { OPPORTUNITY_STATUS_LABEL, OPPORTUNITY_STATUS_TONE, type OpportunityStatus } from "@/lib/opportunity-constants";
import { formatEUR } from "@/lib/money";
import { formatDateEs } from "@/lib/dates";
import { PITCH_ESTADO_CLASS } from "@/lib/pitches";

export const Route = createFileRoute("/_authenticated/portal/propuestas")({
  component: Propuestas,
});

function Propuestas() {
  const { composerId } = usePortalComposer();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-propuestas", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("opportunity_candidates")
        .select("id, note, opportunity:opportunities(id, title, kind, statuses, probability_pct, estimated_value, detected_date, expected_close_date, last_contact_date, partner_company:production_companies(name), partner_name, target_production:productions!opportunities_target_production_id_fkey(title, year), target_production_text)")
        .eq("composer_id", composerId!);
      return (data ?? []).filter((c: any) => c.opportunity);
    },
  });

  const pitchesQ = useQuery({
    queryKey: ["portal-pitches", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("oportunidades_pitch_composers")
        .select("pitch:oportunidades_pitches(id, titulo, estado, tipo, fecha_pitch, fecha_seguimiento, proyecto_vinculado, notas, archivado_at, archivado_motivo, produccion_id)")
        .eq("composer_id", composerId!);
      return (data ?? []).map((r: any) => r.pitch).filter(Boolean);
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
      <PitchSection title="Pitches en curso" pitches={(pitchesQ.data ?? []).filter((p: any) => !p.archivado_at)} />
      <PitchSection
        title="Producciones conseguidas"
        pitches={(pitchesQ.data ?? []).filter((p: any) => p.archivado_at && p.produccion_id)}
      />
      <PitchSection
        title="Descartados"
        muted
        pitches={(pitchesQ.data ?? []).filter((p: any) => p.archivado_at && !p.produccion_id)}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <EmptyState icon={Target} title="Sin propuestas activas" description="Te avisaremos aquí cuando haya una nueva oportunidad en la que estés propuesto." />
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

function PitchSection({ title, pitches, muted }: { title: string; pitches: any[]; muted?: boolean }) {
  if (!pitches.length) return null;
  return (
    <section className="space-y-3">
      <h3 className="smallcaps text-xs text-muted-foreground">{title}</h3>
      <ul className="space-y-3">
        {pitches.map((p: any) => (
          <li key={p.id} className={`rounded-sm border border-border p-4 ${muted ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg">{p.titulo}</p>
              <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${PITCH_ESTADO_CLASS[p.estado] ?? "bg-muted"}`}>
                {p.estado}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[p.proyecto_vinculado, p.tipo].filter(Boolean).join(" · ") || "—"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Mini label="Fecha del pitch" value={formatDateEs(p.fecha_pitch)} />
              <Mini label="Seguimiento" value={formatDateEs(p.fecha_seguimiento)} />
            </div>
            {p.archivado_motivo && (
              <p className="mt-3 text-xs text-muted-foreground">{p.archivado_motivo}</p>
            )}
            {p.notas && <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{p.notas}</p>}
          </li>
        ))}
      </ul>
    </section>
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