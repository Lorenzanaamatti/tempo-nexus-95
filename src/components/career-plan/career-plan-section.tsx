import { useMemo, useState } from "react";
import { Money } from "@/components/money";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Plus } from "lucide-react";
import { formatDateEs } from "@/lib/dates";
import { formatEUR0 } from "@/lib/money";
import {
  ACTION_TYPES,
  CAREER_METRICS,
  LINK_TYPES,
  PLAN_YEARS,
  SOCIAL_NETWORKS,
  useCareerActuals,
  useCareerPlan,
  useCareerPlanRows,
  useInvalidateCareerPlan,
  type CareerMetric,
  type CareerPlan,
} from "@/lib/career-plan";
import { PlatformsChecklist } from "@/components/career-plan/platforms-checklist";

const QUARTERS = [1, 2, 3, 4] as const;

export function CareerPlanSection({
  composerId,
  canEdit,
  isBigC = false,
  mode = "ficha",
}: {
  composerId: string;
  canEdit: boolean;
  isBigC?: boolean;
  mode?: "ficha" | "portal";
}) {
  const year = new Date().getFullYear();
  const planQ = useCareerPlan(composerId, canEdit);
  const plan = planQ.data ?? null;
  const rowsQ = useCareerPlanRows(plan?.id);
  const actualsQ = useCareerActuals(composerId, plan?.id, year);

  if (planQ.isLoading) return <p className="text-sm text-muted-foreground">Cargando plan de carrera…</p>;
  if (!plan) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay plan de carrera creado. El agente responsable o BIG C puede iniciarlo desde la ficha.
      </p>
    );
  }

  const rows = rowsQ.data ?? { targets: [], social: [], custom: [], actions: [] };

  return (
    <div className="space-y-10">
      <ThreeYearGoals plan={plan} canEdit={canEdit} />
      <AnnualTargets plan={plan} targets={rows.targets} canEdit={canEdit} />
      <SocialTargets plan={plan} social={rows.social} custom={rows.custom} canEdit={canEdit} />
      <ProgressCards
        targets={rows.targets}
        year={year}
        actuals={actualsQ.data}
        manual={rows.targets}
        plan={plan}
        canEdit={canEdit}
      />
      <ActionsLog
        plan={plan}
        composerId={composerId}
        actions={rows.actions}
        canEdit={canEdit && mode === "ficha"}
        productions={actualsQ.data?.productions ?? []}
      />
      <div>
        <SubTitle>Checklist de plataformas</SubTitle>
        <PlatformsChecklist composerId={composerId} canEdit={canEdit && mode === "ficha"} isBigC={isBigC && mode === "ficha"} />
      </div>
    </div>
  );
}

export function SubTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="smallcaps text-xs text-muted-foreground">{children}</h3>
      {right}
    </div>
  );
}

/* ---------------- Objetivo a 3 años ---------------- */

export function ThreeYearGoals({ plan, canEdit }: { plan: CareerPlan; canEdit: boolean }) {
  const invalidate = useInvalidateCareerPlan();
  const [local, setLocal] = useState(plan);

  async function save(values: Partial<CareerPlan>) {
    const { error } = await supabase.from("career_plans").update(values).eq("id", plan.id);
    if (error) toast.error(error.message);
    else invalidate();
  }

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <SubTitle>Objetivo a 3 años</SubTitle>
        <ReadBlock label="Posicionamiento" value={plan.objetivo_posicionamiento} />
        <ReadBlock label="Presentación a nuevos clientes" value={plan.objetivo_presentacion_clientes} />
        <ReadBlock label="Facturación objetivo a 3 años" value={plan.objetivo_facturacion_3y != null ? formatEUR0(plan.objetivo_facturacion_3y) : null} />
      </div>
    );
  }

  return (
    <div>
      <SubTitle>Objetivo a 3 años</SubTitle>
      <div className="grid gap-4">
        <label className="space-y-1.5 text-xs text-muted-foreground">
          Posicionamiento
          <Textarea
            rows={3}
            value={local.objetivo_posicionamiento ?? ""}
            placeholder="¿Dónde quiere estar este representado en 3 años en términos de posicionamiento?"
            onChange={(e) => setLocal({ ...local, objetivo_posicionamiento: e.target.value })}
            onBlur={(e) => save({ objetivo_posicionamiento: e.target.value || null })}
          />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">
          Presentación a nuevos clientes
          <Textarea
            rows={3}
            value={local.objetivo_presentacion_clientes ?? ""}
            placeholder="Mercados, plataformas o tipos de cliente que queremos alcanzar"
            onChange={(e) => setLocal({ ...local, objetivo_presentacion_clientes: e.target.value })}
            onBlur={(e) => save({ objetivo_presentacion_clientes: e.target.value || null })}
          />
        </label>
        <label className="max-w-xs space-y-1.5 text-xs text-muted-foreground">
          Facturación objetivo a 3 años (€)
          <Input
            type="number"
            value={local.objetivo_facturacion_3y ?? ""}
            onChange={(e) => setLocal({ ...local, objetivo_facturacion_3y: e.target.value === "" ? null : Number(e.target.value) })}
            onBlur={(e) => save({ objetivo_facturacion_3y: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}

function ReadBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-sm border border-border p-4">
      <p className="smallcaps text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value || "—"}</p>
    </div>
  );
}

/* ---------------- Objetivos anuales ---------------- */

type TargetRow = { id: string; career_plan_id: string; ["año"]: number; metrica: CareerMetric; valor_objetivo: number | null };

export function AnnualTargets({
  plan,
  targets,
  canEdit,
  years = PLAN_YEARS(),
}: {
  plan: CareerPlan;
  targets: any[];
  canEdit: boolean;
  years?: number[];
}) {
  const invalidate = useInvalidateCareerPlan();
  const map = useMemo(() => {
    const m = new Map<string, TargetRow>();
    for (const t of targets as TargetRow[]) m.set(`${t["año"]}-${t.metrica}`, t);
    return m;
  }, [targets]);

  async function setValue(year: number, metrica: CareerMetric, raw: string) {
    const value = raw === "" ? null : Number(raw);
    const { error } = await supabase
      .from("career_plan_targets")
      .upsert({ career_plan_id: plan.id, ["año"]: year, metrica, valor_objetivo: value } as never, {
        onConflict: "career_plan_id,año,metrica",
      });
    if (error) toast.error(error.message);
    else invalidate();
  }

  return (
    <div>
      <SubTitle>Objetivos anuales</SubTitle>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Año</th>
              {CAREER_METRICS.map((m) => (
                <th key={m.key} className="px-3 py-2 font-medium">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {years.map((y) => (
              <tr key={y}>
                <td className="px-3 py-2 font-mono">{y}</td>
                {CAREER_METRICS.map((m) => {
                  const cur = map.get(`${y}-${m.key}`)?.valor_objetivo ?? null;
                  return (
                    <td key={m.key} className="px-2 py-1">
                      {canEdit ? (
                        <Input
                          type="number"
                          className="h-8 w-28"
                          defaultValue={cur ?? ""}
                          onBlur={(e) => String(cur ?? "") !== e.target.value && setValue(y, m.key, e.target.value)}
                        />
                      ) : (
                        <span>{cur == null ? "—" : m.money ? formatEUR0(cur) : cur}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Redes sociales ---------------- */

export function SocialTargets({
  plan,
  social,
  custom,
  canEdit,
  year = new Date().getFullYear(),
}: {
  plan: CareerPlan;
  social: any[];
  custom: any[];
  canEdit: boolean;
  year?: number;
}) {
  const invalidate = useInvalidateCareerPlan();
  const [newNet, setNewNet] = useState("");

  async function setSocial(red: string, trimestre: number, field: "seguidores_objetivo" | "seguidores_real", raw: string) {
    const value = raw === "" ? null : Number(raw);
    const { error } = await supabase
      .from("career_plan_social")
      .upsert(
        { career_plan_id: plan.id, red_social: red, ["año"]: year, trimestre, [field]: value } as never,
        { onConflict: "career_plan_id,red_social,año,trimestre" },
      );
    if (error) toast.error(error.message);
    else invalidate();
  }

  async function setCustom(nombre: string, trimestre: number, field: "valor_objetivo" | "valor_real", raw: string, existingId?: string) {
    const value = raw === "" ? null : Number(raw);
    const { error } = existingId
      ? await supabase.from("career_plan_social_custom").update({ [field]: value } as never).eq("id", existingId)
      : await supabase.from("career_plan_social_custom").insert({
          career_plan_id: plan.id,
          nombre_red: nombre,
          ["año"]: year,
          trimestre,
          metrica_nombre: "Seguidores",
          [field]: value,
        } as never);
    if (error) toast.error(error.message);
    else invalidate();
  }

  const customNames = Array.from(new Set((custom ?? []).map((c: any) => c.nombre_red as string)));

  return (
    <div>
      <SubTitle>Redes sociales · {year}</SubTitle>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SOCIAL_NETWORKS.map((net) => (
          <MiniTable
            key={net}
            title={net}
            rows={QUARTERS.map((q) => {
              const row = (social ?? []).find((s: any) => s.red_social === net && s["año"] === year && s.trimestre === q);
              return {
                key: `Q${q}`,
                objetivo: row?.seguidores_objetivo ?? null,
                real: row?.seguidores_real ?? null,
                onObjetivo: (v: string) => setSocial(net, q, "seguidores_objetivo", v),
                onReal: (v: string) => setSocial(net, q, "seguidores_real", v),
              };
            })}
            canEdit={canEdit}
          />
        ))}
        {customNames.map((nombre) => (
          <MiniTable
            key={nombre}
            title={nombre}
            rows={QUARTERS.map((q) => {
              const row = (custom ?? []).find((s: any) => s.nombre_red === nombre && s["año"] === year && s.trimestre === q);
              return {
                key: `Q${q}`,
                objetivo: row?.valor_objetivo ?? null,
                real: row?.valor_real ?? null,
                onObjetivo: (v: string) => setCustom(nombre, q, "valor_objetivo", v, row?.id),
                onReal: (v: string) => setCustom(nombre, q, "valor_real", v, row?.id),
              };
            })}
            canEdit={canEdit}
          />
        ))}
      </div>
      {canEdit && (
        <div className="mt-4 flex gap-2">
          <Input value={newNet} onChange={(e) => setNewNet(e.target.value)} placeholder="Nueva red social" className="h-9 max-w-xs" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!newNet.trim()) return;
              await setCustom(newNet.trim(), 1, "valor_objetivo", "");
              setNewNet("");
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Añadir red social
          </Button>
        </div>
      )}
    </div>
  );
}

function MiniTable({
  title,
  rows,
  canEdit,
}: {
  title: string;
  rows: { key: string; objetivo: number | null; real: number | null; onObjetivo: (v: string) => void; onReal: (v: string) => void }[];
  canEdit: boolean;
}) {
  return (
    <div className="rounded-sm border border-border">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="px-3 py-1.5 font-normal">Periodo</th>
            <th className="px-3 py-1.5 font-normal">Objetivo</th>
            <th className="px-3 py-1.5 font-normal">Real</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-3 py-1.5 font-mono text-xs">{r.key}</td>
              <td className="px-2 py-1">
                {canEdit ? (
                  <Input type="number" className="h-8" defaultValue={r.objetivo ?? ""} onBlur={(e) => String(r.objetivo ?? "") !== e.target.value && r.onObjetivo(e.target.value)} />
                ) : (
                  (r.objetivo ?? "—")
                )}
              </td>
              <td className="px-2 py-1">
                {canEdit ? (
                  <Input type="number" className="h-8" defaultValue={r.real ?? ""} onBlur={(e) => String(r.real ?? "") !== e.target.value && r.onReal(e.target.value)} />
                ) : (
                  (r.real ?? "—")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Progreso vs. plan ---------------- */

export function ProgressCards({
  targets,
  year,
  actuals,
  plan,
  canEdit,
}: {
  targets: any[];
  year: number;
  actuals: ReturnType<typeof useCareerActuals>["data"];
  manual?: any[];
  plan: CareerPlan;
  canEdit: boolean;
}) {
  const invalidate = useInvalidateCareerPlan();
  const target = (m: CareerMetric) => {
    const row = targets.find((t: any) => t.metrica === m && t["año"] === year);
    return { value: row?.valor_objetivo as number | null | undefined, row };
  };

  const autoValue = (m: CareerMetric): number | null => {
    if (!actuals) return null;
    switch (m) {
      case "facturacion":
        return actuals.facturacion;
      case "sincronizaciones":
        return actuals.sincronizaciones;
      case "cobertura_prensa":
        return actuals.cobertura_prensa;
      case "pitches":
        return actuals.pitches;
      default:
        return null;
    }
  };

  async function saveManual(m: CareerMetric, raw: string) {
    const value = raw === "" ? null : Number(raw);
    const { error } = await supabase
      .from("career_plan_targets")
      .upsert({ career_plan_id: plan.id, ["año"]: year, metrica: m, valor_objetivo: target(m).value ?? null } as never, {
        onConflict: "career_plan_id,año,metrica",
      });
    if (error) return toast.error(error.message);
    const { error: e2 } = await supabase
      .from("career_plan_actions")
      .insert({
        career_plan_id: plan.id,
        fecha: new Date().toISOString().slice(0, 10),
        tipo: "Otro",
        descripcion: `Actualización manual de ${m}: ${value ?? "—"}`,
      } as never);
    if (e2) toast.error(e2.message);
    invalidate();
  }

  return (
    <div>
      <SubTitle>Progreso vs. plan · {year}</SubTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CAREER_METRICS.map((m) => {
          const t = target(m.key).value ?? null;
          const actual = m.auto ? autoValue(m.key) : manualValue(plan, m.key, year, targets);
          const pct = t && t > 0 && actual != null ? Math.min(100, Math.round((actual / t) * 100)) : null;
          return (
            <div key={m.key} className="rounded-sm border border-border p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="smallcaps text-[11px] text-muted-foreground">{m.label}</p>
                {!m.auto && <Badge variant="outline" className="text-[10px]">Manual</Badge>}
              </div>
              <p className="mt-1 font-display text-2xl">
                {actual == null ? "—" : m.money ? formatEUR0(actual) : actual}
                <span className="ml-2 text-sm text-muted-foreground">/ {t == null ? "—" : m.money ? formatEUR0(t) : t}</span>
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-muted">
                <div className="h-full bg-primary" style={{ width: `${pct ?? 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{pct == null ? "Sin objetivo definido" : `${pct}%`}</p>
              {!m.auto && canEdit && (
                <Input
                  type="number"
                  className="mt-2 h-8"
                  placeholder="Valor actual"
                  defaultValue={manualValue(plan, m.key, year, targets) ?? ""}
                  onBlur={(e) => setManual(plan.id, m.key, year, e.target.value).then(invalidate)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Los valores manuales se guardan en career_plan_targets con año negativo-espejo
   (mismo año, métrica con sufijo) — se usa la columna valor_real virtual vía
   career_plan_social_custom para no duplicar tablas. */
function manualValue(plan: CareerPlan, m: CareerMetric, year: number, targets: any[]): number | null {
  const row = targets.find((t: any) => t.metrica === m && t["año"] === year);
  return (row?.valor_real as number | undefined) ?? null;
}

async function setManual(planId: string, m: CareerMetric, year: number, raw: string) {
  const value = raw === "" ? null : Number(raw);
  const { error } = await supabase
    .from("career_plan_targets")
    .update({ valor_real: value } as never)
    .eq("career_plan_id", planId)
    .eq("año", year)
    .eq("metrica", m);
  if (error) toast.error(error.message);
}

/* ---------------- Registro de acciones ---------------- */

export function ActionsLog({
  plan,
  composerId,
  actions,
  canEdit,
  productions,
}: {
  plan: CareerPlan;
  composerId: string;
  actions: any[];
  canEdit: boolean;
  productions: any[];
}) {
  const invalidate = useInvalidateCareerPlan();
  const [showProd, setShowProd] = useState(true);
  const [showFact, setShowFact] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    tipo: "Pitch" as string,
    descripcion: "",
    resultado: "",
    vinculo_tipo: "Ninguno" as string,
    vinculo_id: "",
  });

  const derived = useMemo(() => {
    const items: { id: string; fecha: string; tipo: string; descripcion: string; resultado: string | null; to?: string }[] = [];
    if (showProd) {
      for (const p of productions) {
        items.push({
          id: `prod-${p.id}`,
          fecha: p.estimated_delivery_date ?? `${p.year ?? new Date().getFullYear()}-01-01`,
          tipo: "Producción",
          descripcion: p.title ?? "Producción",
          resultado: p.status ?? null,
          to: `/producciones/${p.id}`,
        });
      }
    }
    if (showFact) {
      for (const p of productions.filter((x) => Number(x.fee_amount ?? 0) > 0)) {
        items.push({
          id: `fact-${p.id}`,
          fecha: `${p.year ?? new Date().getFullYear()}-12-31`,
          tipo: "Facturación",
          descripcion: `${p.title ?? "Producción"} — ${formatEUR0(p.fee_amount)}`,
          resultado: null,
        });
      }
    }
    return items;
  }, [showProd, showFact, productions]);

  const all = [
    ...actions.map((a: any) => ({
      id: a.id,
      fecha: a.fecha,
      tipo: a.tipo,
      descripcion: a.descripcion,
      resultado: a.resultado,
      to: a.vinculo_tipo === "Producción" && a.vinculo_id ? `/producciones/${a.vinculo_id}` : undefined,
    })),
    ...derived,
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  async function create() {
    if (!form.descripcion.trim()) return toast.error("La descripción es obligatoria");
    const { error } = await supabase.from("career_plan_actions").insert({
      career_plan_id: plan.id,
      fecha: form.fecha,
      tipo: form.tipo,
      descripcion: form.descripcion.trim(),
      resultado: form.resultado.trim() || null,
      vinculo_tipo: form.vinculo_tipo,
      vinculo_id: form.vinculo_id.trim() || null,
    } as never);
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ ...form, descripcion: "", resultado: "", vinculo_id: "" });
    invalidate();
  }

  return (
    <div>
      <SubTitle
        right={
          canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  <Plus className="mr-1 h-4 w-4" /> Registrar acción
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar acción</DialogTitle>
                  <DialogDescription>Añade una acción al registro del plan de carrera.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                  <select
                    className="h-10 rounded-sm border border-input bg-background px-3 text-sm"
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <Textarea rows={3} placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                  <Input placeholder="Resultado (opcional)" value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-10 rounded-sm border border-input bg-background px-3 text-sm"
                      value={form.vinculo_tipo}
                      onChange={(e) => setForm({ ...form, vinculo_tipo: e.target.value })}
                    >
                      {LINK_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="ID vinculado (opcional)"
                      value={form.vinculo_id}
                      disabled={form.vinculo_tipo === "Ninguno"}
                      onChange={(e) => setForm({ ...form, vinculo_id: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={create}>
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      >
        Registro de acciones
      </SubTitle>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Toggle active={showProd} onClick={() => setShowProd((v) => !v)} label="Producciones" />
        <Toggle active={showFact} onClick={() => setShowFact((v) => !v)} label="Facturación" />
        <Toggle active={showCal} onClick={() => setShowCal((v) => !v)} label="Calendario" />
      </div>
      {showCal && <CalendarActions composerId={composerId} />}
      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin acciones registradas.</p>
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {all.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-3 px-3 py-2.5 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{formatDateEs(a.fecha)}</span>
              <Badge variant="outline" className="text-[10px]">
                {a.tipo}
              </Badge>
              <span className="min-w-0 flex-1">{a.descripcion}</span>
              {a.resultado && <span className="text-xs text-muted-foreground">{a.resultado}</span>}
              {a.to && (
                <Link to={a.to as never} aria-label="Abrir vínculo" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <Separator className="mt-6" />
    </div>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-sm border px-2.5 py-1 transition " +
        (active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}

function CalendarActions({ composerId }: { composerId: string }) {
  return (
    <p className="mb-3 text-xs text-muted-foreground">
      Los eventos de calendario vinculados a este representado se muestran en su agenda.{" "}
      <Link to="/calendar" search={{ composerId } as never} className="underline">
        Abrir calendario
      </Link>
    </p>
  );
}
