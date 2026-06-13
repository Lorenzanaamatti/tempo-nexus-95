import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { FinanceDashboard } from "@/components/finance-dashboard";
import { formatEUR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useCurrentRole } from "@/lib/use-role";

const searchSchema = z.object({ composerId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/_admin/finance")({
  validateSearch: (s) => searchSchema.parse(s),
  component: FinancePage,
});

function FinancePage() {
  const { composerId } = Route.useSearch();
  const { isBigC, loading: roleLoading } = useCurrentRole();
  const composerQ = useQuery({
    queryKey: ["finance-composer", composerId ?? null],
    enabled: !!composerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composers")
        .select("full_name, artistic_name")
        .eq("id", composerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (roleLoading) {
    return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  }
  if (!isBigC) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="smallcaps text-muted-foreground">Acceso restringido</p>
        <h1 className="mt-2 font-display text-4xl">Solo BIG C</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          El módulo económico contiene datos financieros sensibles y solo está disponible para usuarios con rol BIG C.
        </p>
      </div>
    );
  }

  const title = composerId
    ? `Económico · ${composerQ.data?.artistic_name || composerQ.data?.full_name || ""}`
    : "Económico · IC";
  const eyebrow = composerId ? "Compositor" : "Compañía";
  const description = composerId
    ? "Previsto, facturado y cobrado de las producciones donde este compositor está asignado."
    : "Presupuesto por proyecto y consolidación temporal de previsto, facturado y cobrado.";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="smallcaps text-muted-foreground">{eyebrow}</p>
        <h1 className="font-display text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Evolución temporal</h2>
        <FinanceDashboard composerId={composerId ?? null} />
      </section>

      <section className="mt-12 space-y-3">
        <h2 className="font-display text-2xl">Presupuesto por proyecto</h2>
        <BudgetTable composerId={composerId ?? null} />
      </section>

      {!composerId && (
        <>
          <section className="mt-12 space-y-3">
            <h2 className="font-display text-2xl">Business Plan · Presupuesto vs. real</h2>
            <BusinessPlanPanel />
          </section>
          <section className="mt-12 space-y-3">
            <h2 className="font-display text-2xl">Gastos operativos IC</h2>
            <IcExpensesPanel />
          </section>
        </>
      )}
    </div>
  );
}

function BudgetTable({ composerId }: { composerId: string | null }) {
  const productionsQ = useQuery({
    queryKey: ["budget-productions", composerId ?? null],
    queryFn: async () => {
      let q = supabase
        .from("productions")
        .select("id, title, year, fee_amount, ic_commission, ic_commission_pct, status, composer_id, composers(full_name, artistic_name)")
        .order("year", { ascending: false });
      if (composerId) q = q.eq("composer_id", composerId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const sprintsQ = useQuery({
    queryKey: ["budget-sprints", composerId ?? null],
    queryFn: async () => {
      let q = (supabase as any)
        .from("production_billing_sprints")
        .select("production_id, kind, amount, status, productions!inner(composer_id)");
      if (composerId) q = q.eq("productions.composer_id", composerId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  if (productionsQ.isLoading || sprintsQ.isLoading) {
    return <div className="font-display text-muted-foreground">Cargando presupuesto…</div>;
  }

  type Agg = { work: number; workInv: number; workPaid: number; comm: number; commInv: number; commPaid: number };
  const byProd = new Map<string, Agg>();
  for (const s of (sprintsQ.data ?? []) as any[]) {
    const cur = byProd.get(s.production_id) ?? { work: 0, workInv: 0, workPaid: 0, comm: 0, commInv: 0, commPaid: 0 };
    const amt = Number(s.amount) || 0;
    if (s.kind === "trabajo") {
      cur.work += amt;
      if (s.status === "facturado" || s.status === "cobrado") cur.workInv += amt;
      if (s.status === "cobrado") cur.workPaid += amt;
    } else {
      cur.comm += amt;
      if (s.status === "facturado" || s.status === "cobrado") cur.commInv += amt;
      if (s.status === "cobrado") cur.commPaid += amt;
    }
    byProd.set(s.production_id, cur);
  }

  const rows = (productionsQ.data ?? []).map((p: any) => ({
    ...p,
    agg: byProd.get(p.id) ?? { work: 0, workInv: 0, workPaid: 0, comm: 0, commInv: 0, commPaid: 0 },
  }));

  const totals = rows.reduce(
    (acc, r: any) => {
      acc.feeBudget += Number(r.fee_amount) || 0;
      acc.commBudget += Number(r.ic_commission) || 0;
      acc.workInv += r.agg.workInv;
      acc.workPaid += r.agg.workPaid;
      acc.commInv += r.agg.commInv;
      acc.commPaid += r.agg.commPaid;
      return acc;
    },
    { feeBudget: 0, commBudget: 0, workInv: 0, workPaid: 0, commInv: 0, commPaid: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Mini label="Fee presupuestado" value={formatEUR(totals.feeBudget)} />
        <Mini label="Trabajo facturado" value={formatEUR(totals.workInv)} hint={`Cobrado: ${formatEUR(totals.workPaid)}`} />
        <Mini label="Trabajo pendiente" value={formatEUR(totals.feeBudget - totals.workInv)} />
        <Mini label="Comisión IC presupuestada" value={formatEUR(totals.commBudget)} />
        <Mini label="Comisión IC facturada" value={formatEUR(totals.commInv)} hint={`Cobrada: ${formatEUR(totals.commPaid)}`} />
        <Mini label="Comisión IC pendiente" value={formatEUR(totals.commBudget - totals.commInv)} />
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 smallcaps text-xs">Año</th>
              <th className="px-3 py-2 smallcaps text-xs">Proyecto</th>
              <th className="px-3 py-2 smallcaps text-xs">Representado</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Fee</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Trabajo fact.</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Trabajo cobrado</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Com. IC</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Com. fact.</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Com. cobrada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r: any) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-3 py-2 text-muted-foreground">{r.year ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link to="/productions/$productionId" params={{ productionId: r.id }} className="font-display hover:underline">{r.title}</Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.composers?.artistic_name || r.composers?.full_name || "—"}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.fee_amount)}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.agg.workInv)}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.agg.workPaid)}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.ic_commission)}{r.ic_commission_pct != null && <span className="ml-1 text-xs text-muted-foreground">({r.ic_commission_pct}%)</span>}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.agg.commInv)}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.agg.commPaid)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Aún no hay producciones registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Mini({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <p className="smallcaps text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ============ Business Plan ============

const CATEGORIES = [
  { key: "ingreso_comision", label: "Ingreso · Comisiones", type: "income" },
  { key: "ingreso_otros",    label: "Ingreso · Otros",      type: "income" },
  { key: "gasto_personal",   label: "Gasto · Personal",     type: "expense" },
  { key: "gasto_operativo",  label: "Gasto · Operativo",    type: "expense" },
  { key: "gasto_marketing",  label: "Gasto · Marketing",    type: "expense" },
  { key: "gasto_otros",      label: "Gasto · Otros",        type: "expense" },
] as const;
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label])) as Record<string, string>;
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function BusinessPlanPanel() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const budgetQ = useQuery({
    queryKey: ["ic-budget", year],
    queryFn: async () =>
      ((await (supabase as any).from("ic_budget_lines").select("*").eq("year", year)).data ?? []) as any[],
  });

  const sprintsQ = useQuery({
    queryKey: ["ic-budget-actual-commission", year],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("production_billing_sprints")
        .select("amount, status, invoiced_date, paid_date, kind")
        .eq("kind", "comision");
      return (data ?? []).filter((s: any) => {
        const ref = s.paid_date || s.invoiced_date;
        return ref && new Date(ref).getFullYear() === year;
      });
    },
  });

  const expensesQ = useQuery({
    queryKey: ["ic-expenses-year", year],
    queryFn: async () =>
      ((await (supabase as any).from("ic_expenses").select("amount, category, expense_date").gte("expense_date", `${year}-01-01`).lte("expense_date", `${year}-12-31`)).data ?? []) as any[],
  });

  // budget map: cat -> 12 values
  const budgetByCat: Record<string, number[]> = useMemo(() => {
    const m: Record<string, number[]> = {};
    for (const c of CATEGORIES) m[c.key] = Array(12).fill(0);
    for (const l of budgetQ.data ?? []) m[l.category][l.month - 1] = Number(l.amount) || 0;
    return m;
  }, [budgetQ.data]);

  // actual map
  const actualByCat: Record<string, number[]> = useMemo(() => {
    const m: Record<string, number[]> = {};
    for (const c of CATEGORIES) m[c.key] = Array(12).fill(0);
    for (const s of sprintsQ.data ?? []) {
      const ref = s.paid_date || s.invoiced_date;
      const month = new Date(ref).getMonth();
      m.ingreso_comision[month] += Number(s.amount) || 0;
    }
    for (const e of expensesQ.data ?? []) {
      const month = new Date(e.expense_date).getMonth();
      if (m[e.category]) m[e.category][month] += Number(e.amount) || 0;
    }
    return m;
  }, [sprintsQ.data, expensesQ.data]);

  async function setBudgetCell(category: string, month: number, value: number) {
    const existing = (budgetQ.data ?? []).find((l: any) => l.category === category && l.month === month);
    if (existing) {
      await (supabase as any).from("ic_budget_lines").update({ amount: value }).eq("id", existing.id);
    } else {
      await (supabase as any).from("ic_budget_lines").insert({ year, month, category, amount: value });
    }
    qc.invalidateQueries({ queryKey: ["ic-budget", year] });
  }

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  // totals
  const sumRow = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const totalBudgetIncome = CATEGORIES.filter((c) => c.type === "income").reduce((a, c) => a + sumRow(budgetByCat[c.key]), 0);
  const totalBudgetExpense = CATEGORIES.filter((c) => c.type === "expense").reduce((a, c) => a + sumRow(budgetByCat[c.key]), 0);
  const totalActualIncome = CATEGORIES.filter((c) => c.type === "income").reduce((a, c) => a + sumRow(actualByCat[c.key]), 0);
  const totalActualExpense = CATEGORIES.filter((c) => c.type === "expense").reduce((a, c) => a + sumRow(actualByCat[c.key]), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-xs">Año</Label>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Ingresos previstos" value={formatEUR(totalBudgetIncome)} hint={`Real: ${formatEUR(totalActualIncome)}`} />
        <Mini label="Gastos previstos" value={formatEUR(totalBudgetExpense)} hint={`Real: ${formatEUR(totalActualExpense)}`} />
        <Mini label="Margen previsto" value={formatEUR(totalBudgetIncome - totalBudgetExpense)} />
        <Mini label="Margen real" value={formatEUR(totalActualIncome - totalActualExpense)} hint={`Desv.: ${formatEUR((totalActualIncome - totalActualExpense) - (totalBudgetIncome - totalBudgetExpense))}`} />
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-2 py-2 smallcaps">Categoría</th>
              <th className="px-2 py-2 smallcaps">Tipo</th>
              {MONTHS.map((m) => <th key={m} className="px-2 py-2 smallcaps text-right">{m}</th>)}
              <th className="px-2 py-2 smallcaps text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CATEGORIES.map((c) => {
              const bud = budgetByCat[c.key];
              const act = actualByCat[c.key];
              return (
                <>
                  <tr key={c.key + "-bud"} className="bg-card/30">
                    <td className="px-2 py-1.5 font-medium" rowSpan={2}>{c.label}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">Plan</td>
                    {bud.map((v, i) => (
                      <td key={i} className="px-1 py-1 text-right">
                        <Input
                          type="number"
                          defaultValue={v || ""}
                          className="h-7 w-20 text-right text-xs"
                          onBlur={(e) => {
                            const nv = Number(e.target.value) || 0;
                            if (nv !== v) setBudgetCell(c.key, i + 1, nv);
                          }}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right font-medium">{formatEUR(sumRow(bud))}</td>
                  </tr>
                  <tr key={c.key + "-act"}>
                    <td className="px-2 py-1.5 text-muted-foreground">Real</td>
                    {act.map((v, i) => {
                      const delta = v - bud[i];
                      const tone = c.type === "income"
                        ? (delta >= 0 ? "text-emerald-600" : "text-rose-600")
                        : (delta <= 0 ? "text-emerald-600" : "text-rose-600");
                      return (
                        <td key={i} className={`px-2 py-1.5 text-right ${v ? tone : "text-muted-foreground"}`}>
                          {v ? formatEUR(v) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-right font-medium">{formatEUR(sumRow(act))}</td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Los ingresos por comisión se calculan automáticamente desde los sprints de facturación. Los demás reales vienen de los gastos IC registrados abajo.
      </p>
    </div>
  );
}

// ============ IC Expenses ============

function IcExpensesPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const dataQ = useQuery({
    queryKey: ["ic-expenses"],
    queryFn: async () =>
      ((await (supabase as any).from("ic_expenses").select("*, providers(name)").order("expense_date", { ascending: false })).data ?? []) as any[],
  });

  const providersQ = useQuery({
    queryKey: ["providers-min"],
    queryFn: async () =>
      ((await (supabase as any).from("providers").select("id, name").order("name")).data ?? []) as any[],
  });

  const total = (dataQ.data ?? []).reduce((a: number, e: any) => a + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Total registrado: <strong>{formatEUR(total)}</strong></p>
        <Button size="sm" onClick={() => setEditing({ expense_date: new Date().toISOString().slice(0, 10), category: "gasto_operativo" })}>
          <Plus className="mr-1 h-4 w-4" />Nuevo gasto
        </Button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 smallcaps text-xs">Fecha</th>
              <th className="px-3 py-2 smallcaps text-xs">Concepto</th>
              <th className="px-3 py-2 smallcaps text-xs">Categoría</th>
              <th className="px-3 py-2 smallcaps text-xs">Proveedor</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Importe</th>
              <th className="px-3 py-2 smallcaps text-xs">Pagado</th>
              <th className="px-3 py-2 smallcaps text-xs"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(dataQ.data ?? []).map((e: any) => (
              <tr key={e.id} className="hover:bg-muted/30">
                <td className="px-3 py-2 text-muted-foreground">{e.expense_date}</td>
                <td className="px-3 py-2">{e.concept}</td>
                <td className="px-3 py-2 text-muted-foreground">{CAT_LABEL[e.category]}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.providers?.name ?? "—"}</td>
                <td className="px-3 py-2 text-right">{formatEUR(e.amount)}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.paid_date ?? "—"}</td>
                <td className="px-3 py-2"><Button size="sm" variant="ghost" onClick={() => setEditing(e)}><Pencil className="h-3 w-3" /></Button></td>
              </tr>
            ))}
            {!dataQ.data?.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Sin gastos registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <ExpenseDialog
          expense={editing}
          providers={providersQ.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["ic-expenses"] }); qc.invalidateQueries({ queryKey: ["ic-expenses-year"] }); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ExpenseDialog({ expense, providers, onClose, onSaved }: { expense: any; providers: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    expense_date: expense.expense_date ?? new Date().toISOString().slice(0, 10),
    category: expense.category ?? "gasto_operativo",
    concept: expense.concept ?? "",
    provider_id: expense.provider_id ?? null,
    amount: expense.amount ?? "",
    vat_pct: expense.vat_pct ?? "",
    paid_date: expense.paid_date ?? "",
    notes: expense.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.concept || !form.amount) return toast.error("Concepto e importe obligatorios");
    setSaving(true);
    const payload = {
      expense_date: form.expense_date,
      category: form.category,
      concept: form.concept,
      provider_id: form.provider_id || null,
      amount: Number(form.amount),
      vat_pct: form.vat_pct ? Number(form.vat_pct) : null,
      paid_date: form.paid_date || null,
      notes: form.notes || null,
    };
    const op = expense.id
      ? (supabase as any).from("ic_expenses").update(payload).eq("id", expense.id)
      : (supabase as any).from("ic_expenses").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    onSaved();
  }

  async function remove() {
    if (!expense.id || !confirm("¿Eliminar gasto?")) return;
    await (supabase as any).from("ic_expenses").delete().eq("id", expense.id);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{expense.id ? "Editar gasto" : "Nuevo gasto IC"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Fecha</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
          <div>
            <Label className="text-xs">Categoría</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.filter((c) => c.type === "expense").map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label className="text-xs">Concepto</Label><Input value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} /></div>
          <div>
            <Label className="text-xs">Proveedor</Label>
            <Select value={form.provider_id ?? "__none__"} onValueChange={(v) => setForm({ ...form, provider_id: v === "__none__" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin proveedor —</SelectItem>
                {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Importe (€)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label className="text-xs">IVA %</Label><Input type="number" step="0.01" value={form.vat_pct} onChange={(e) => setForm({ ...form, vat_pct: e.target.value })} /></div>
          <div><Label className="text-xs">Pagado el</Label><Input type="date" value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} /></div>
          <div className="col-span-2"><Label className="text-xs">Notas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter className="flex w-full justify-between sm:justify-between">
          {expense.id ? <Button variant="ghost" onClick={remove} disabled={saving}>Eliminar</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}