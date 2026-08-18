import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isFinalized } from "@/lib/production-lifecycle";
import { productionGroup, ROSTER_PROSPECT_FUNNEL_RANK, type RosterProspectEstado } from "@/lib/kpi-constants";

const db = supabase as any;
const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
const yearOf = (d: string | null | undefined) => (d ? Number(d.slice(0, 4)) : null);
const monthOf = (d: string) => Number(d.slice(5, 7)) - 1;
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export type Kpis = ReturnType<typeof compute>;

function compute(year: number, raw: any) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  // ---------- ECONÓMICO (production_billing_sprints) ----------
  const sprints: any[] = raw.sprints ?? [];
  const invoiced = sprints.filter((s) => s.invoiced_date || s.paid_date);
  const invDate = (s: any) => (s.invoiced_date ?? s.paid_date) as string;

  const byMonth = Array.from({ length: 12 }, () => 0);
  const byMonthPrev = Array.from({ length: 12 }, () => 0);
  let facturacionAnual = 0;
  const byComposer = new Map<string, number>();
  const byType = new Map<string, number>();

  for (const s of invoiced) {
    const d = invDate(s);
    const y = yearOf(d);
    const amount = num(s.amount);
    if (y === year) {
      facturacionAnual += amount;
      byMonth[monthOf(d)] += amount;
      const composer = s.productions?.composers?.artistic_name || s.productions?.composers?.full_name || "Sin representado";
      byComposer.set(composer, (byComposer.get(composer) ?? 0) + amount);
      const g = productionGroup(s.productions?.kind);
      byType.set(g, (byType.get(g) ?? 0) + amount);
    } else if (y === year - 1) {
      byMonthPrev[monthOf(d)] += amount;
    }
  }

  // ---------- COBROS ----------
  const unpaid = sprints.filter((s) => !s.paid_date && s.status !== "cobrado");
  const pendienteCobro = unpaid.reduce((t, s) => t + num(s.amount), 0);
  const vencidas = unpaid.filter((s) => s.due_date && s.due_date < todayIso);
  const vencidasTotal = vencidas.reduce((t, s) => t + num(s.amount), 0);
  const inWindow = (days: number) => {
    const limit = new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);
    return unpaid
      .filter((s) => s.due_date && s.due_date >= todayIso && s.due_date <= limit)
      .reduce((t, s) => t + num(s.amount), 0);
  };
  const avgCollectionDays = (y: number) => {
    const rows = sprints.filter(
      (s) => s.paid_date && s.invoiced_date && yearOf(s.paid_date) === y && s.paid_date >= s.invoiced_date,
    );
    if (!rows.length) return null;
    return Math.round(rows.reduce((t, s) => t + daysBetween(s.invoiced_date, s.paid_date), 0) / rows.length);
  };

  // ---------- PIPELINE ----------
  const opportunities: any[] = raw.opportunities ?? [];
  const isClosed = (o: any) => (o.statuses ?? []).some((s: string) => s === "cerrado" || s === "descartado");
  const open = opportunities.filter((o) => !isClosed(o));
  const kindBucket = (k: string) =>
    k === "pitch" ? "producciones" : k === "fichaje" ? "roster" : "partners";
  const openByKind = { producciones: 0, partners: 0, roster: 0 } as Record<string, number>;
  for (const o of open) openByKind[kindBucket(o.kind)] += 1;

  const productions: any[] = raw.productions ?? [];
  const closedInYear = opportunities.filter(
    (o) => isClosed(o) && yearOf(o.expected_close_date ?? o.updated_at) === year,
  );
  const convertedInYear = productions.filter(
    (p) => p.source_opportunity_id && yearOf(p.created_at) === year,
  );
  const conversionRate = closedInYear.length
    ? (convertedInYear.length / closedInYear.length) * 100
    : null;

  const oppById = new Map(opportunities.map((o) => [o.id, o]));
  const closeDurations = convertedInYear
    .map((p) => {
      const o = oppById.get(p.source_opportunity_id);
      if (!o) return null;
      return daysBetween(o.created_at.slice(0, 10), p.created_at.slice(0, 10));
    })
    .filter((d): d is number => d != null && d >= 0);
  const avgCloseDays = closeDurations.length
    ? Math.round(closeDurations.reduce((a, b) => a + b, 0) / closeDurations.length)
    : null;

  const pipelineValue = open.reduce((t, o) => t + num(o.estimated_value), 0);

  // ---------- ROSTER ----------
  const composers: any[] = raw.composers ?? [];
  const activos = composers.filter((c) => c.representation_status === "activo");
  const fichajes = composers.filter((c) => yearOf(c.representation_start_date) === year);
  const bajas = composers.filter(
    (c) => c.representation_status === "finalizado" && yearOf(c.updated_at) === year,
  );
  const activeProdComposers = new Set(
    productions.filter((p) => !isFinalized(p.status) && p.composer_id).map((p) => p.composer_id),
  );
  const lastActivity = new Map<string, string>();
  for (const p of productions) {
    if (!p.composer_id) continue;
    const d = String(p.updated_at ?? p.created_at ?? "").slice(0, 10);
    if (!d) continue;
    const prev = lastActivity.get(p.composer_id);
    if (!prev || d > prev) lastActivity.set(p.composer_id, d);
  }
  const cutoff = new Date(today.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  const inactivos = activos
    .filter((c) => {
      const last = lastActivity.get(c.id) ?? c.representation_start_date ?? String(c.created_at ?? "").slice(0, 10);
      return !last || last < cutoff;
    })
    .map((c) => ({
      id: c.id,
      name: c.artistic_name || c.full_name,
      last: lastActivity.get(c.id) ?? null,
    }));

  // ---------- PROSPECTS DE FICHAJE ----------
  const prospects: any[] = (raw.rosterProspects ?? []).filter(
    (p: any) => yearOf(p.fecha_primer_contacto) === year,
  );
  const rank = (e: RosterProspectEstado) => ROSTER_PROSPECT_FUNNEL_RANK[e] ?? 0;
  const funnel = [
    { label: "Solicitudes recibidas", value: prospects.length },
    { label: "Reuniones mantenidas", value: prospects.filter((p) => rank(p.estado) >= 2).length },
    { label: "Oferta enviada", value: prospects.filter((p) => rank(p.estado) >= 3).length },
    { label: "Aceptados (fichajes)", value: prospects.filter((p) => p.estado === "aceptado").length },
    { label: "Rechazados por IC", value: prospects.filter((p) => p.estado === "rechazado_ic").length },
    { label: "Rechazados por el compositor", value: prospects.filter((p) => p.estado === "rechazado_compositor").length },
  ];

  // ---------- COMERCIAL NACIONAL ----------
  const accounts: any[] = raw.targetAccounts ?? [];
  const contactadas = accounts.filter(
    (a) => a.status !== "sin_contacto" && yearOf(a.last_contact_date ?? a.updated_at) === year,
  ).length;
  const reunionesPartners = accounts.filter(
    (a) => a.status === "reunion" && yearOf(a.last_contact_date ?? a.updated_at) === year,
  ).length;
  const clientesActivos = accounts.filter(
    (a) => a.status === "cliente_activo" && yearOf(a.updated_at) === year,
  ).length;

  // ---------- INTERNACIONAL ----------
  const intl: any[] = (raw.intlProspects ?? []).filter(
    (p: any) => yearOf(p.fecha_primer_contacto) === year,
  );
  const intlActivos = intl.filter(
    (p) => p.estado_propuesta !== "rechazada" && p.estado_propuesta !== "aceptada",
  ).length;
  const intlReuniones = intl.reduce((t, p) => t + num(p.reuniones_mantenidas), 0);
  const intlPropuestas = intl.filter((p) => p.estado_propuesta !== "sin_propuesta").length;
  const intlOutcome = {
    aceptadas: intl.filter((p) => p.estado_propuesta === "aceptada").length,
    rechazadas: intl.filter((p) => p.estado_propuesta === "rechazada").length,
    en_curso: intl.filter((p) => p.estado_propuesta === "en_curso").length,
  };

  // ---------- PRODUCCIONES ----------
  const activasCount = productions.filter((p) => !isFinalized(p.status)).length;
  const finalizadasYear = productions.filter((p) => {
    if (!isFinalized(p.status)) return false;
    const d = p.actual_delivery_date ?? p.delivery_date ?? p.premiere_date;
    return d ? yearOf(d) === year : p.year === year;
  });
  const finalizadasByType = new Map<string, number>();
  for (const p of finalizadasYear) {
    const g = productionGroup(p.kind);
    finalizadasByType.set(g, (finalizadasByType.get(g) ?? 0) + 1);
  }
  const clientCount = new Map<string, number>();
  for (const p of productions) {
    const d = p.actual_delivery_date ?? p.delivery_date ?? p.premiere_date;
    const y = d ? yearOf(d) : p.year;
    if (y !== year) continue;
    const name = p.platform || p.production_company || "Sin cliente";
    clientCount.set(name, (clientCount.get(name) ?? 0) + 1);
  }

  // ---------- MARKETING ----------
  const campaigns: any[] = (raw.campaigns ?? []).filter(
    (c: any) => yearOf(c.fecha_inicio ?? c.created_at) === year,
  );
  const gastoReal = campaigns.reduce((t, c) => t + num(c.gasto_real), 0);
  const presupuesto = campaigns.reduce((t, c) => t + num(c.presupuesto_asignado), 0);
  const byCanal = new Map<string, number>();
  for (const c of campaigns) byCanal.set(c.canal, (byCanal.get(c.canal) ?? 0) + num(c.gasto_real));

  // ---------- OBJETIVOS ----------
  const objetivos: Record<string, number> = {};
  for (const o of raw.objetivos ?? []) objetivos[o.metrica] = Number(o.valor_objetivo);

  const top = (m: Map<string, number>, n: number) =>
    Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, n);

  return {
    objetivos,
    economico: {
      facturacionAnual,
      monthly: byMonth.map((v, i) => ({ month: i, value: v, prev: byMonthPrev[i] })),
      porRepresentado: top(byComposer, 10),
      porTipo: top(byType, 10),
    },
    cobros: {
      pendiente: pendienteCobro,
      vencidasCount: vencidas.length,
      vencidasTotal,
      diasMedios: avgCollectionDays(year),
      diasMediosPrev: avgCollectionDays(year - 1),
      d30: inWindow(30),
      d60: inWindow(60),
      d90: inWindow(90),
    },
    pipeline: {
      openTotal: open.length,
      openByKind,
      conversionRate,
      pipelineValue,
      avgCloseDays,
      closedInYear: closedInYear.length,
    },
    roster: {
      activos: activos.length,
      fichajes: fichajes.length,
      bajas: bajas.length,
      conProduccion: activos.filter((c) => activeProdComposers.has(c.id)).length,
      inactivos,
      funnel,
    },
    nacional: { contactadas, reunionesPartners, clientesActivos },
    internacional: {
      activos: intlActivos,
      reuniones: intlReuniones,
      propuestas: intlPropuestas,
      outcome: intlOutcome,
    },
    producciones: {
      activas: activasCount,
      finalizadas: finalizadasYear.length,
      finalizadasByType: Array.from(finalizadasByType.entries()).map(([name, value]) => ({ name, value })),
      topClientes: top(clientCount, 5),
    },
    marketing: {
      gastoReal,
      presupuesto,
      porCanal: top(byCanal, 10),
      campaigns,
    },
  };
}

export function useEmpresaKpis(year: number) {
  return useQuery({
    queryKey: ["empresa-kpis", year],
    queryFn: async () => {
      const [sprints, opportunities, productions, composers, targetAccounts, rosterProspects, intlProspects, campaigns, objetivos] =
        await Promise.all([
          db
            .from("production_billing_sprints")
            .select(
              "id, amount, due_date, invoiced_date, paid_date, status, kind, productions(kind, composer_id, composers!productions_composer_id_fkey(full_name, artistic_name))",
            ),
          db.from("opportunities").select("id, kind, statuses, estimated_value, created_at, updated_at, expected_close_date"),
          db
            .from("productions")
            .select(
              "id, title, kind, status, year, composer_id, platform, production_company, created_at, updated_at, delivery_date, actual_delivery_date, premiere_date, source_opportunity_id",
            ),
          db.from("composers").select("id, full_name, artistic_name, representation_status, representation_start_date, created_at, updated_at"),
          db.from("target_accounts").select("id, status, last_contact_date, updated_at"),
          db.from("roster_prospects").select("id, nombre, estado, fecha_primer_contacto, fecha_decision"),
          db.from("international_prospects").select("id, nombre_empresa, pais, tipo, reuniones_mantenidas, estado_propuesta, fecha_primer_contacto"),
          db.from("marketing_campaigns").select("*"),
          db.from("empresa_objetivos").select("metrica, valor_objetivo").eq("anio", year),
        ]);
      const first = [sprints, opportunities, productions, composers, targetAccounts, rosterProspects, intlProspects, campaigns, objetivos].find(
        (r: any) => r.error,
      ) as any;
      if (first?.error) throw first.error;
      return {
        computed: compute(year, {
          sprints: sprints.data,
          opportunities: opportunities.data,
          productions: productions.data,
          composers: composers.data,
          targetAccounts: targetAccounts.data,
          rosterProspects: rosterProspects.data,
          intlProspects: intlProspects.data,
          campaigns: campaigns.data,
          objetivos: objetivos.data,
        }),
        fetchedAt: new Date(),
      };
    },
    refetchInterval: 60_000,
  });
}