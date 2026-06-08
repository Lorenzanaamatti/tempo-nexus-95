import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { PRODUCTION_STATUS_LABEL, PRODUCTION_KIND_LABEL, type ProductionStatus, type ProductionKind } from "@/lib/production-constants";
import { formatEUR } from "@/lib/money";
import { formatDateEs } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/portal/proyectos")({
  component: Proyectos,
});

function Proyectos() {
  const { composerId } = usePortalComposer();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-proyectos", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const PROD_SELECT = "id, title, kind, status, year, director, production_company, platform, partner, notes, fee_amount, ic_commission_pct, delivery_date, premiere_date, nomination_date, award_date, updated_at";
      const [direct, viaAssign, { data: history }] = await Promise.all([
        (supabase as any).from("productions").select(PROD_SELECT).eq("composer_id", composerId!),
        (supabase as any)
          .from("production_assignments")
          .select(`production:productions(${PROD_SELECT})`)
          .eq("composer_id", composerId!),
        supabase
          .from("composer_projects")
          .select("id, production, year, director, production_company, platform, music_type, notes, production_type")
          .eq("composer_id", composerId!)
          .order("position"),
      ]);
      const map = new Map<string, any>();
      ((direct.data ?? []) as any[]).forEach((p) => map.set(p.id, p));
      ((viaAssign.data ?? []) as any[]).forEach((row: any) => {
        if (row.production) map.set(row.production.id, row.production);
      });
      const prods = Array.from(map.values()).sort(
        (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
      );
      return { productions: prods, history: history ?? [] };
    },
  });

  const productions = data?.productions ?? [];
  const history = data?.history ?? [];

  const ACTIVE_STATUSES = new Set<ProductionStatus>([
    "compositor_confirmado","presupuesto_enviado","presupuesto_confirmado",
    "contrato_enviado","contrato_negociacion","contrato_firmado",
    "visuales_entregados","en_composicion","en_produccion","en_mezclas",
    "entrega_parcial","entrega_total","entregables_completados",
  ]);
  const activas = productions.filter((p: any) => ACTIVE_STATUSES.has(p.status as ProductionStatus));
  const otras = productions.filter((p: any) => !ACTIVE_STATUSES.has(p.status as ProductionStatus));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Proyectos activos</h2>
        <p className="mt-2 text-sm text-muted-foreground">Producciones gestionadas por IC, sincronizadas con tu ficha en la agencia.</p>
      </header>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <Section title="En marcha" items={activas} />
          <Section title="Otras producciones" items={otras} muted />
          {history.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-display text-xl">Histórico financiero registrado por IC</h3>
              <ul className="space-y-2">
                {history.map((p: any) => (
                  <li key={p.id} className="rounded-sm border border-border p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-display">{p.production}</p>
                      <span className="smallcaps text-xs text-muted-foreground">{p.year || ""}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[p.director, p.production_company, p.platform, p.production_type, p.music_type].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!productions.length && !history.length && (
            <p className="text-sm text-muted-foreground">Aún no hay producciones asignadas por la agencia.</p>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, items, muted }: { title: string; items: any[]; muted?: boolean }) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h3 className={`font-display text-xl ${muted ? "text-muted-foreground" : ""}`}>{title}</h3>
      <ul className="space-y-3">
        {items.map((p) => (
          <li key={p.id} className="rounded-sm border border-border p-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-lg">{p.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                {p.kind && (
                  <span className="smallcaps rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {PRODUCTION_KIND_LABEL[p.kind as ProductionKind] ?? p.kind}
                  </span>
                )}
                {p.status && (
                  <span className="smallcaps rounded-sm bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {PRODUCTION_STATUS_LABEL[p.status as ProductionStatus] ?? p.status}
                  </span>
                )}
                {p.year && <span className="smallcaps text-xs text-muted-foreground">{p.year}</span>}
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[p.director, p.production_company || p.partner, p.platform].filter(Boolean).join(" · ") || "—"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Info label="Entrega" value={formatDateEs(p.delivery_date)} />
              <Info label="Estreno" value={formatDateEs(p.premiere_date)} />
              <Info label="Facturación" value={p.fee_amount != null ? formatEUR(p.fee_amount) : "—"} />
              <Info label="Comisión IC" value={p.ic_commission_pct != null ? `${p.ic_commission_pct}%` : "—"} />
            </div>
            {p.notes && (
              <div className="mt-3 rounded-sm border border-border bg-card/40 p-3">
                <p className="smallcaps text-xs text-muted-foreground">Notas de la agencia</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{p.notes}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/30 px-2 py-1">
      <p className="smallcaps text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs tabular-nums">{value || "—"}</p>
    </div>
  );
}