import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Globe, Target as TargetIcon, Users } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/list-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { useEmpresaKpis } from "@/lib/use-empresa-kpis";
import { formatEUR, formatEUR0, formatIntEs, parseAmount } from "@/lib/money";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateEs, formatShortDateTimeEs } from "@/lib/dates";
import {
  CAMPAIGN_CANAL_LABEL, CHART_COLORS, MONTHS_ES, OBJETIVO_GRUPOS, OBJETIVO_METRICAS, yearOptions,
  type CampaignCanal,
} from "@/lib/kpi-constants";

export const Route = createFileRoute("/_authenticated/_admin/empresa/kpis")({
  component: KpisPage,
});

const db = supabase as any;
const eur = (v: number) => formatEUR(v || 0);

function KpisPage() {
  const { isBigC, loading } = useCurrentRole();
  const [year, setYear] = useState(new Date().getFullYear());
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const q = useEmpresaKpis(year);
  const years = useMemo(() => yearOptions(), []);

  if (loading) return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  if (!isBigC) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <EmptyState title="Sin acceso" description="Esta sección solo está disponible para BIG C." />
      </div>
    );
  }

  const k = q.data?.computed;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Empresa</p>
          <h1 className="mt-1 font-display text-5xl title-caps">KPIS & OBJETIVOS</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cuadro de mando de empresa: económico, cobros, pipeline, roster, actividad comercial, producciones y marketing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setTargetsOpen(true)}>Establecer objetivos {year}</Button>
          <p className="w-full text-right text-xs text-muted-foreground sm:w-auto">
            Actualizado: {q.data ? formatShortDateTimeEs(q.data.fetchedAt) : "—"}
          </p>
        </div>
      </div>

      {q.isLoading || !k ? (
        <ListSkeleton rows={8} />
      ) : (
        <div className="space-y-12">
          {/* OBJETIVOS VS REAL */}
          <Section
            title={`Objetivos ${year} vs. real`}
            action={<Button variant="outline" size="sm" onClick={() => setTargetsOpen(true)}>Editar objetivos</Button>}
          >
            <ObjetivosGrid objetivos={k.objetivos} actuales={k.actuales} detalles={k.detalles} />
          </Section>

          {/* ECONÓMICO */}
          <Section title="Económico">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-sm border border-border bg-card/40 p-5 lg:col-span-1">
                <p className="smallcaps text-xs text-muted-foreground">Facturación {year}</p>
                <p className="mt-1 font-display text-4xl">{eur(k.economico.facturacionAnual)}</p>
                <Goal actual={k.economico.facturacionAnual} target={k.objetivos.facturacion_anual} money />
              </div>
              <div className="rounded-sm border border-border bg-card/40 p-5 lg:col-span-2">
                <p className="smallcaps text-xs text-muted-foreground">Facturación mes a mes vs. objetivo proporcional</p>
                <ChartBox>
                  <ComposedChart data={k.economico.monthly.map((m) => ({
                    name: MONTHS_ES[m.month],
                    valor: m.value,
                    objetivo: k.objetivos.facturacion_anual ? k.objetivos.facturacion_anual / 12 : null,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => formatEUR0(v)} />
                    <Tooltip formatter={(v: any) => eur(Number(v))} />
                    <Bar dataKey="valor" name="Facturado" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
                    {k.objetivos.facturacion_anual ? (
                      <Line dataKey="objetivo" name="Objetivo mensual" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
                    ) : null}
                  </ComposedChart>
                </ChartBox>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Panel title="Facturación por representado (top 10)">
                {!k.economico.porRepresentado.length ? <NoData /> : (
                  <ChartBox height={320}>
                    <BarChart layout="vertical" data={k.economico.porRepresentado}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatEUR0(v)} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => eur(Number(v))} />
                      <Bar dataKey="value" name="Facturación" fill="var(--chart-1)" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ChartBox>
                )}
              </Panel>
              <Panel title="Facturación por tipo de producción">
                {!k.economico.porTipo.length ? <NoData /> : (
                  <ChartBox height={320}>
                    <PieChart>
                      <Pie data={k.economico.porTipo} dataKey="value" nameKey="name" innerRadius={65} outerRadius={110}>
                        {k.economico.porTipo.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(v: any) => eur(Number(v))} />
                    </PieChart>
                  </ChartBox>
                )}
              </Panel>
            </div>
            <div className="mt-4">
              <Panel title={`Comparativa ${year} vs. ${year - 1}`}>
                <ChartBox>
                  <LineChart data={k.economico.monthly.map((m) => ({
                    name: MONTHS_ES[m.month], actual: m.value, anterior: m.prev,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => formatEUR0(v)} />
                    <Tooltip formatter={(v: any) => eur(Number(v))} />
                    <Legend />
                    <Line dataKey="actual" name={String(year)} stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                    <Line dataKey="anterior" name={String(year - 1)} stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartBox>
              </Panel>
            </div>
          </Section>

          {/* COBROS */}
          <Section title="Cobros">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card label="Total pendiente de cobro" value={eur(k.cobros.pendiente)} />
              <Card
                label="Facturas vencidas"
                value={`${k.cobros.vencidasCount} · ${eur(k.cobros.vencidasTotal)}`}
                alert={k.cobros.vencidasCount > 0}
              />
              <Card
                label="Días medios de cobro"
                value={k.cobros.diasMedios == null ? "—" : `${k.cobros.diasMedios} días`}
                hint={
                  k.cobros.diasMedios != null && k.cobros.diasMediosPrev != null
                    ? `${k.cobros.diasMedios - k.cobros.diasMediosPrev >= 0 ? "+" : ""}${k.cobros.diasMedios - k.cobros.diasMediosPrev} vs. ${year - 1}`
                    : undefined
                }
                trend={
                  k.cobros.diasMedios != null && k.cobros.diasMediosPrev != null
                    ? k.cobros.diasMedios <= k.cobros.diasMediosPrev ? "up" : "down"
                    : undefined
                }
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Card label="Previsto 30 días" value={eur(k.cobros.d30)} />
              <Card label="Previsto 60 días" value={eur(k.cobros.d60)} />
              <Card label="Previsto 90 días" value={eur(k.cobros.d90)} />
            </div>
          </Section>

          {/* PIPELINE */}
          <Section title="Pipeline">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-sm border border-border bg-card/40 p-4">
                <p className="smallcaps text-xs text-muted-foreground">Oportunidades abiertas</p>
                <p className="mt-1 font-display text-3xl">{k.pipeline.openTotal}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>A Producciones<br /><b className="font-display text-base text-foreground">{k.pipeline.openByKind.producciones}</b></span>
                  <span>A Partners<br /><b className="font-display text-base text-foreground">{k.pipeline.openByKind.partners}</b></span>
                  <span>A Roster<br /><b className="font-display text-base text-foreground">{k.pipeline.openByKind.roster}</b></span>
                </div>
              </div>
              <Card
                label="Tasa de conversión"
                value={k.pipeline.conversionRate == null ? "—" : `${k.pipeline.conversionRate.toFixed(0)} %`}
                hint={`${k.pipeline.closedInYear} oportunidades cerradas en ${year}`}
              />
              <Card label="Valor estimado del pipeline" value={eur(k.pipeline.pipelineValue)} />
              <Card
                label="Tiempo medio de cierre"
                value={k.pipeline.avgCloseDays == null ? "—" : `${k.pipeline.avgCloseDays} días`}
              />
            </div>
          </Section>

          {/* ROSTER */}
          <Section title="Roster">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card label="Representados activos" value={String(k.roster.activos)} />
                <div className="rounded-sm border border-border bg-card/40 p-4">
                  <p className="smallcaps text-xs text-muted-foreground">Fichajes confirmados {year}</p>
                  <p className="mt-1 font-display text-3xl">{k.roster.fichajes}</p>
                  <Goal actual={k.roster.fichajes} target={k.objetivos.fichajes} />
                </div>
                <Card label={`Bajas en ${year}`} value={String(k.roster.bajas)} />
                <Card label="Con producción activa" value={String(k.roster.conProduccion)} />
                <button
                  type="button"
                  onClick={() => setShowInactive((v) => !v)}
                  className="rounded-sm border border-border bg-card/40 p-4 text-left transition hover:border-foreground/30 sm:col-span-2"
                >
                  <p className="smallcaps text-xs text-muted-foreground">Sin actividad en 90+ días</p>
                  <p className="mt-1 font-display text-3xl">{k.roster.inactivos.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {showInactive ? "Ocultar listado" : "Ver quiénes son"}
                  </p>
                </button>
                {showInactive && (
                  <div className="rounded-sm border border-border bg-card/40 p-4 sm:col-span-2">
                    {!k.roster.inactivos.length ? <NoData /> : (
                      <ul className="space-y-1 text-sm">
                        {k.roster.inactivos.map((c) => (
                          <li key={c.id} className="flex items-center justify-between gap-3">
                            <Link to="/composers/$composerId" params={{ composerId: c.id }} className="hover:underline">{c.name}</Link>
                            <span className="text-xs text-muted-foreground">
                              {c.last ? `última actividad ${formatDateEs(c.last)}` : "sin actividad registrada"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <Panel
                title={`Prospects de fichaje ${year}`}
                action={<Button variant="outline" size="sm" asChild><Link to="/oportunidades/prospects-fichaje">Gestionar prospects</Link></Button>}
              >
                {!k.roster.funnel[0].value ? (
                  <EmptyState variant="inline" icon={Users} title="Sin prospects" description="Añade candidatos para ver el embudo de fichajes." />
                ) : (
                  <ul className="space-y-2">
                    {k.roster.funnel.map((step, i) => {
                      const total = k.roster.funnel[0].value || 1;
                      return (
                        <li key={step.label}>
                          <div className="flex items-center justify-between text-sm">
                            <span>{step.label}</span>
                            <span className="font-display">{step.value}</span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-sm bg-muted">
                            <div
                              className="h-2 rounded-sm"
                              style={{
                                width: `${Math.min(100, (step.value / total) * 100)}%`,
                                background: CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>
          </Section>

          {/* COMERCIAL NACIONAL */}
          <Section title="Actividad comercial nacional">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card label={`Cuentas objetivo contactadas en ${year}`} value={String(k.nacional.contactadas)} />
              <div className="rounded-sm border border-border bg-card/40 p-4">
                <p className="smallcaps text-xs text-muted-foreground">Reuniones con partners</p>
                <p className="mt-1 font-display text-3xl">{k.nacional.reunionesPartners}</p>
                <Goal actual={k.nacional.reunionesPartners} target={k.objetivos.reuniones_partners} />
              </div>
              <Card label="Cuentas convertidas en cliente activo" value={String(k.nacional.clientesActivos)} />
            </div>
          </Section>

          {/* COMERCIAL INTERNACIONAL */}
          <Section
            title="Actividad comercial internacional"
            action={<Button variant="outline" size="sm" asChild><Link to="/empresa/actividad-internacional">Gestionar actividad internacional</Link></Button>}
          >
            {!k.internacional.activos && !k.internacional.reuniones && !k.internacional.propuestas ? (
              <EmptyState variant="inline" icon={Globe} title="Sin actividad internacional" description="Registra prospects internacionales para ver estas métricas." />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card label="Prospects internacionales activos" value={String(k.internacional.activos)} />
              <div className="rounded-sm border border-border bg-card/40 p-4">
                <p className="smallcaps text-xs text-muted-foreground">Reuniones mantenidas</p>
                <p className="mt-1 font-display text-3xl">{k.internacional.reuniones}</p>
                <Goal actual={k.internacional.reuniones} target={k.objetivos.reuniones_internacionales} />
              </div>
              <Card label="Propuestas enviadas" value={String(k.internacional.propuestas)} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Card label="Aceptadas" value={String(k.internacional.outcome.aceptadas)} />
              <Card label="Rechazadas" value={String(k.internacional.outcome.rechazadas)} alert={k.internacional.outcome.rechazadas > 0} />
              <Card label="En curso" value={String(k.internacional.outcome.en_curso)} />
            </div>
          </Section>

          {/* PRODUCCIONES */}
          <Section title="Producciones">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-sm border border-border bg-card/40 p-4">
                <p className="smallcaps text-xs text-muted-foreground">Producciones activas</p>
                <p className="mt-1 font-display text-3xl">{k.producciones.activas}</p>
                <Link to="/producciones/activas" className="mt-1 inline-block text-xs text-muted-foreground hover:underline">
                  Ver producciones activas
                </Link>
              </div>
              <div className="rounded-sm border border-border bg-card/40 p-4">
                <p className="smallcaps text-xs text-muted-foreground">Finalizadas en {year}</p>
                <p className="mt-1 font-display text-3xl">{k.producciones.finalizadas}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {k.producciones.finalizadasByType.map((t) => (
                    <span key={t.name}>{t.name} <b className="font-display text-sm text-foreground">{t.value}</b></span>
                  ))}
                </div>
              </div>
              <Panel title="Top 5 clientes por producciones">
                {!k.producciones.topClientes.length ? <NoData /> : (
                  <ChartBox height={220}>
                    <BarChart layout="vertical" data={k.producciones.topClientes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Producciones" fill="var(--chart-4)" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ChartBox>
                )}
              </Panel>
            </div>
          </Section>

          {/* MARKETING */}
          <Section
            title="Marketing"
            action={<Button variant="outline" size="sm" asChild><Link to="/marketing/campanas">Gestionar campañas</Link></Button>}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-sm border border-border bg-card/40 p-5">
                <p className="smallcaps text-xs text-muted-foreground">Inversión total en marketing</p>
                <p className="mt-1 font-display text-4xl">{eur(k.marketing.gastoReal)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Presupuesto asignado: {eur(k.marketing.presupuesto)}</p>
                <Goal actual={k.marketing.gastoReal} target={k.objetivos.inversion_marketing || k.marketing.presupuesto} money />
              </div>
              <Panel title="Inversión por canal">
                {!k.marketing.porCanal.length ? <NoData /> : (
                  <ChartBox height={260}>
                    <PieChart>
                      <Pie
                        data={k.marketing.porCanal.map((c) => ({ ...c, name: CAMPAIGN_CANAL_LABEL[c.name as CampaignCanal] ?? c.name }))}
                        dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}
                      >
                        {k.marketing.porCanal.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(v: any) => eur(Number(v))} />
                    </PieChart>
                  </ChartBox>
                )}
              </Panel>
            </div>
            <div className="mt-4">
              {!k.marketing.campaigns.length ? (
                <EmptyState variant="inline" icon={TargetIcon} title="Sin campañas" description={`Todavía no hay campañas registradas en ${year}.`} />
              ) : (
                <div className="overflow-x-auto rounded-sm border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-left">
                      <tr>
                        <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Campaña</th>
                        <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Canal</th>
                        <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Gasto real</th>
                        <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Alcance</th>
                        <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Leads</th>
                        <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Conversiones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {k.marketing.campaigns.map((c: any) => (
                        <tr key={c.id} className="border-t border-border">
                          <td className="px-3 py-2 font-display">{c.nombre}</td>
                          <td className="px-3 py-2">{CAMPAIGN_CANAL_LABEL[c.canal as CampaignCanal] ?? c.canal}</td>
                          <td className="px-3 py-2 tabular-nums">{eur(Number(c.gasto_real ?? 0))}</td>
                          <td className="px-3 py-2 tabular-nums">{formatIntEs(c.alcance ?? 0)}</td>
                          <td className="px-3 py-2 tabular-nums">{c.leads_generados ?? 0}</td>
                          <td className="px-3 py-2 tabular-nums">{c.conversiones ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>
        </div>
      )}

      <TargetsDialog
        open={targetsOpen}
        onOpenChange={setTargetsOpen}
        year={year}
        current={k?.objetivos ?? {}}
      />
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
        <h2 className="font-display text-2xl title-caps">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="smallcaps text-xs text-muted-foreground">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChartBox({ children, height = 260 }: { children: ReactNode; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
    </div>
  );
}

function NoData() {
  return <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para este periodo.</p>;
}

function Card({
  label, value, hint, alert, trend,
}: { label: string; value: string; hint?: string; alert?: boolean; trend?: "up" | "down" }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <p className="smallcaps text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-3xl ${alert ? "text-primary" : ""}`}>{value}</p>
      {hint && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
          {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
          {hint}
        </p>
      )}
    </div>
  );
}

function Goal({ actual, target, money }: { actual: number; target?: number; money?: boolean }) {
  if (!target) return null;
  const pct = Math.min(100, Math.round((actual / target) * 100));
  return (
    <div className="mt-3">
      <Progress value={pct} />
      <p className="mt-1 text-xs text-muted-foreground">
        {pct}% del objetivo · {money ? eur(target) : formatIntEs(target)}
      </p>
    </div>
  );
}

function NamesTooltip({ names, children }: { names?: string[]; children: ReactNode }) {
  if (!names || !names.length) return <>{children}</>;
  return (
    <UiTooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted underline-offset-4">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <ul className="space-y-0.5 text-xs">
          {names.slice(0, 15).map((n, i) => <li key={`${n}-${i}`}>{n}</li>)}
          {names.length > 15 && <li className="opacity-70">y {names.length - 15} más…</li>}
        </ul>
      </TooltipContent>
    </UiTooltip>
  );
}

function ObjetivosGrid({
  objetivos, actuales, detalles,
}: { objetivos: Record<string, number>; actuales: Record<string, number>; detalles?: Record<string, string[]> }) {
  const withTarget = OBJETIVO_METRICAS.filter((m) => objetivos[m.key] != null && objetivos[m.key] > 0);
  if (!withTarget.length) {
    return (
      <p className="rounded-sm border border-dashed border-border p-6 text-sm text-muted-foreground">
        Todavía no hay objetivos definidos para este año. Pulsa «Editar objetivos» para fijarlos.
      </p>
    );
  }
  return (
    <TooltipProvider delayDuration={100}>
    <div className="space-y-6">
      {OBJETIVO_GRUPOS.map((g) => {
        const rows = withTarget.filter((m) => m.group === g);
        if (!rows.length) return null;
        return (
          <div key={g}>
            <p className="smallcaps mb-2 text-xs text-muted-foreground">{g}</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((m) => {
                const target = objetivos[m.key];
                const actual = actuales[m.key] ?? 0;
                const pct = m.lowerIsBetter
                  ? actual > 0
                    ? Math.min(100, Math.round((target / actual) * 100))
                    : 100
                  : Math.min(100, Math.round((actual / target) * 100));
                const fmt = (v: number) => (m.unit === "€" ? eur(v) : formatIntEs(v));
                const ok = m.lowerIsBetter ? actual > 0 && actual <= target : actual >= target;
                return (
                  <div key={m.key} className="rounded-sm border border-border bg-card/40 p-4">
                    <p className="smallcaps text-xs text-muted-foreground">{m.label}</p>
                    <p className={`mt-1 font-display text-3xl ${ok ? "" : "text-primary"}`}>
                      <NamesTooltip names={detalles?.[m.key]}>
                        {fmt(actual)}
                        {m.unit === "días" ? " d" : ""}
                      </NamesTooltip>
                    </p>
                    <Progress className="mt-3" value={pct} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pct}% · objetivo {fmt(target)}
                      {m.unit === "días" ? " d" : ""}
                    </p>
                    {m.hint && <p className="mt-1 text-[11px] text-muted-foreground/80">{m.hint}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
    </TooltipProvider>
  );
}

function TargetsDialog({
  open, onOpenChange, year, current,
}: { open: boolean; onOpenChange: (v: boolean) => void; year: number; current: Record<string, number> }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const valueFor = (key: string) =>
    values[key] ?? (current[key] != null ? String(current[key]) : "");

  const save = async () => {
    setSaving(true);
    const rows = OBJETIVO_METRICAS.map((m) => ({
      anio: year,
      metrica: m.key,
      valor_objetivo: parseAmount(valueFor(m.key)) ?? 0,
    })).filter((r) => r.valor_objetivo > 0);
    const { error } = await db.from("empresa_objetivos").upsert(rows, { onConflict: "anio,metrica" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setValues({});
    qc.invalidateQueries({ queryKey: ["empresa-kpis"] });
    onOpenChange(false);
    toast.success(`Objetivos ${year} guardados`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Establecer objetivos {year}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {OBJETIVO_GRUPOS.map((g) => {
            const rows = OBJETIVO_METRICAS.filter((m) => m.group === g);
            if (!rows.length) return null;
            return (
              <div key={g}>
                <p className="smallcaps mb-2 border-b border-border pb-1 text-xs text-muted-foreground">{g}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {rows.map((m) => (
                    <div key={m.key}>
                      <Label htmlFor={`obj-${m.key}`}>{m.label} ({m.unit})</Label>
                      <Input
                        id={`obj-${m.key}`}
                        inputMode="decimal"
                        value={valueFor(m.key)}
                        onChange={(e) => setValues((v) => ({ ...v, [m.key]: e.target.value }))}
                        placeholder="0"
                      />
                      {m.hint && <p className="mt-1 text-[11px] text-muted-foreground">{m.hint}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Guardar objetivos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
