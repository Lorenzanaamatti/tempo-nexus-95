import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatNumberEs } from "@/lib/money";
import { computeFinance, liquidationText, pctOfIncome, type IcFeeConfig } from "@/lib/production-finance";
import { ChangeReasonDialog, logProductionChanges, type PendingChange } from "@/components/production-detail/change-reason-dialog";
import { toast } from "sonner";
import { Download, Mail, Maximize2, Plus, X } from "lucide-react";

const db = supabase as any;
export const BILLING_ORDER_RECIPIENT = "maggy@plus-music.com";

export type FinanceLineRow = {
  id: string;
  production_id: string;
  kind: "ingreso" | "gasto";
  concept: string;
  counterparty_name: string | null;
  counterparty_type: "partner" | "productora" | "cuenta" | "manual" | null;
  counterparty_id: string | null;
  amount_initial: number | null;
  amount_final: number | null;
  period: string | null;
  invoice_issued: boolean;
  invoice_settled: boolean;
  is_sale_price: boolean;
  position: number;
};

export type FinanceProduction = {
  id: string;
  title: string;
  composer_id: string | null;
  commission_basis: string | null;
  ic_commission_pct: number | null;
  ic_fee_mode: string | null;
  ic_fee_pct_initial: number | null;
  ic_fee_fixed_initial: number | null;
  ic_fee_fixed_final: number | null;
  ic_fee_invoiced: boolean | null;
  ic_fee_paid: boolean | null;
};

export function useFinanceLines(productionId: string) {
  return useQuery({
    queryKey: ["finance-lines", productionId],
    queryFn: async () => {
      const { data, error } = await db.from("production_finance_lines").select("*").eq("production_id", productionId)
        .order("is_sale_price", { ascending: false }).order("position").order("created_at");
      if (error) throw error;
      return (data ?? []) as FinanceLineRow[];
    },
  });
}

function useFinanceProduction(productionId: string) {
  return useQuery({
    queryKey: ["finance-production", productionId],
    queryFn: async () => {
      const { data, error } = await db.from("productions")
        .select("id, title, composer_id, commission_basis, ic_commission_pct, ic_fee_mode, ic_fee_pct_initial, ic_fee_fixed_initial, ic_fee_fixed_final, ic_fee_invoiced, ic_fee_paid")
        .eq("id", productionId).single();
      if (error) throw error;
      return data as FinanceProduction;
    },
  });
}

type CpOption = { id: string; name: string; type: "partner" | "productora" | "cuenta" };
function useCounterparties(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ["finance-counterparties"],
    queryFn: async () => {
      const [p, c, a, l] = await Promise.all([
        db.from("partners").select("id, nombre").limit(2000),
        db.from("production_companies").select("id, name").limit(2000),
        db.from("target_accounts").select("id, name").limit(2000),
        db.from("production_finance_lines").select("concept, kind").limit(5000),
      ]);
      const opts: CpOption[] = [
        ...(p.data ?? []).map((r: any) => ({ id: r.id, name: r.nombre, type: "partner" as const })),
        ...(c.data ?? []).map((r: any) => ({ id: r.id, name: r.name, type: "productora" as const })),
        ...(a.data ?? []).map((r: any) => ({ id: r.id, name: r.name, type: "cuenta" as const })),
      ].filter((o) => o.name);
      const uniq = (k: string) => Array.from(new Set((l.data ?? []).filter((r: any) => r.kind === k).map((r: any) => (r.concept || "").trim()).filter(Boolean))).sort((x: any, y: any) => x.localeCompare(y, "es")) as string[];
      return { opts, incomeConcepts: uniq("ingreso"), expenseConcepts: uniq("gasto") };
    },
  });
}

const eur = (v: number | null | undefined) => (v == null ? "" : `${formatNumberEs(v)} €`);
const signed = (v: number, neg: boolean) => (v === 0 ? eur(0) : `${neg ? "−" : ""}${formatNumberEs(Math.abs(v))} €`);
const diffTxt = (d: number) => `${d > 0 ? "+" : d < 0 ? "−" : ""}${formatNumberEs(Math.abs(d))} €`;
const pctTxt = (v: number | null) => (v == null ? "—" : `${v.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`);
const parseNum = (s: string) => {
  const t = s.trim().replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : NaN;
};
const TYPE_LABEL: Record<string, string> = { partner: "Partner", productora: "Productora", cuenta: "Cuenta" };

function feeConfig(p: FinanceProduction | undefined): IcFeeConfig {
  return {
    mode: p?.ic_fee_mode === "fijo" ? "fijo" : "pct",
    basis: p?.commission_basis === "margen" ? "margen" : "precio",
    pctInitial: p?.ic_fee_pct_initial ?? p?.ic_commission_pct ?? null,
    pctFinal: p?.ic_commission_pct ?? null,
    fixedInitial: p?.ic_fee_fixed_initial ?? null,
    fixedFinal: p?.ic_fee_fixed_final ?? null,
  };
}

/** Campo numérico que guarda al salir. */
function NumCell({ value, onSave, readOnly, className = "" }: { value: number | null; onSave: (v: number | null) => void; readOnly?: boolean; className?: string }) {
  const [txt, setTxt] = useState<string | null>(null);
  if (readOnly) return <span className={className}>{eur(value)}</span>;
  return (
    <input
      className={`w-full bg-transparent text-right tabular-nums outline-none focus:ring-1 focus:ring-ring rounded-sm px-1 ${className}`}
      value={txt ?? (value == null ? "" : formatNumberEs(value))}
      placeholder="0,00"
      onFocus={() => setTxt(value == null ? "" : formatNumberEs(value))}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={() => {
        const v = parseNum(txt ?? "");
        setTxt(null);
        if (Number.isNaN(v)) return toast.error("Importe no válido");
        if (v !== value) onSave(v);
      }}
    />
  );
}

function TextCell({ value, onSave, readOnly, list, placeholder }: { value: string; onSave: (v: string) => void; readOnly?: boolean; list?: string; placeholder?: string }) {
  const [txt, setTxt] = useState<string | null>(null);
  if (readOnly) return <span>{value || "—"}</span>;
  return (
    <input
      list={list}
      placeholder={placeholder}
      className="w-full bg-transparent outline-none focus:ring-1 focus:ring-ring rounded-sm px-1"
      value={txt ?? value}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={() => { const v = (txt ?? value).trim(); setTxt(null); if (v !== value) onSave(v); }}
    />
  );
}

export function ProductionFinance({ productionId, readOnly = false }: { productionId: string; readOnly?: boolean }) {
  const qc = useQueryClient();
  const linesQ = useFinanceLines(productionId);
  const prodQ = useFinanceProduction(productionId);
  const cpQ = useCounterparties(!readOnly);
  const [full, setFull] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [pending, setPending] = useState<(PendingChange & { apply: (reason: string) => Promise<void> }) | null>(null);

  const lines = linesQ.data ?? [];
  const prod = prodQ.data;
  const cfg = feeConfig(prod);
  const fin = useMemo(() => computeFinance(lines, cfg), [lines, cfg.mode, cfg.basis, cfg.pctInitial, cfg.pctFinal, cfg.fixedInitial, cfg.fixedFinal]);
  const income = lines.filter((l) => l.kind === "ingreso");
  const expenses = lines.filter((l) => l.kind === "gasto");

  function invalidate() {
    for (const k of ["finance-lines", "finance-production", "produccion"]) qc.invalidateQueries({ queryKey: [k, productionId] });
    qc.invalidateQueries({ queryKey: ["finance-counterparties"] });
    qc.invalidateQueries({ queryKey: ["finance-summary"] });
  }

  async function updateLine(line: FinanceLineRow, patch: Partial<FinanceLineRow>) {
    const { error } = await db.from("production_finance_lines").update(patch).eq("id", line.id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  function saveAmount(line: FinanceLineRow, key: "amount_initial" | "amount_final", v: number | null) {
    if (line.is_sale_price && key === "amount_final" && line.amount_final != null) {
      setPending({
        title: "Precio de venta (se ve igual en Datos principales)",
        changes: [{ field: "fee_amount", label: "Precio de venta", old: eur(line.amount_final), next: eur(v) }],
        apply: async (reason) => {
          await updateLine(line, { amount_final: v });
          await logProductionChanges([{ production_id: productionId, subject: "Precio de venta", field: "fee_amount", old_value: eur(line.amount_final), new_value: eur(v), reason }]);
          qc.invalidateQueries({ queryKey: ["production-change-log"] });
        },
      });
      return;
    }
    void updateLine(line, { [key]: v } as any);
  }

  async function saveCounterparty(line: FinanceLineRow, name: string) {
    const match = (cpQ.data?.opts ?? []).find((o) => o.name.toLowerCase() === name.toLowerCase());
    await updateLine(line, match
      ? { counterparty_name: match.name, counterparty_type: match.type, counterparty_id: match.id }
      : { counterparty_name: name || null, counterparty_type: name ? "manual" : null, counterparty_id: null });
  }

  async function createCrmCard(line: FinanceLineRow) {
    const name = line.counterparty_name?.trim();
    if (!name) return;
    const { data, error } = await db.from("production_companies").insert({ name }).select("id").single();
    if (error) return toast.error(error.message);
    await updateLine(line, { counterparty_type: "productora", counterparty_id: data.id });
    toast.success(`Ficha de «${name}» creada en el CRM`);
  }

  async function addLine(kind: "ingreso" | "gasto") {
    const { error } = await db.from("production_finance_lines").insert({
      production_id: productionId, composer_id: prod?.composer_id ?? null, kind, concept: "",
      position: lines.filter((l) => l.kind === kind).length + 1,
    });
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function removeLine(line: FinanceLineRow) {
    const { error } = await db.from("production_finance_lines").delete().eq("id", line.id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function updateProd(patch: Record<string, unknown>) {
    const { error } = await db.from("productions").update(patch).eq("id", productionId);
    if (error) return toast.error(error.message);
    invalidate();
  }

  if (linesQ.isLoading || prodQ.isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  const cpCell = (l: FinanceLineRow) => (
    <div className="flex items-center gap-1">
      <TextCell value={l.counterparty_name ?? ""} readOnly={readOnly} list="finance-cp" placeholder={l.kind === "ingreso" ? "Cliente" : "Proveedor"} onSave={(v) => saveCounterparty(l, v)} />
      {!readOnly && l.counterparty_type && l.counterparty_type !== "manual" && (
        <span className="smallcaps text-[10px] text-muted-foreground">{TYPE_LABEL[l.counterparty_type]}</span>
      )}
      {!readOnly && l.counterparty_type === "manual" && l.counterparty_name && (
        <button type="button" className="whitespace-nowrap text-[11px] text-primary underline" onClick={() => createCrmCard(l)}>Crear ficha</button>
      )}
    </div>
  );

  const F = "border-x border-border/80 bg-muted/30"; // marco suave de «Importe total»
  const td = "px-2.5 py-2 border-b border-border/60 whitespace-nowrap";
  const head = (a: string, b: string, c1: string, c2: string, first = false) => (
    <tr className="bg-muted font-semibold">
      <td className={td}>{a}</td><td className={td}>{b}</td>
      <td className={`${td} text-right`}>Importe inicial</td><td className={`${td} text-right`}>%</td>
      <td className={`${td} text-right ${F} ${first ? "border-t" : ""}`}>Importe total</td><td className={`${td} text-right`}>%</td>
      <td className={`${td} text-right`}>Diferencia</td><td className={`${td} text-center`}>{c1}</td><td className={`${td} text-center`}>{c2}</td>
      {!readOnly && <td className={td} />}
    </tr>
  );
  const spacer = <tr aria-hidden><td colSpan={4} className="h-5" /><td className={F} /><td colSpan={readOnly ? 4 : 5} /></tr>;
  const lineRow = (l: FinanceLineRow) => {
    const neg = l.kind === "gasto";
    const i = Number(l.amount_initial ?? 0), f = Number(l.amount_final ?? 0);
    return (
      <tr key={l.id}>
        <td className={td}><TextCell value={l.concept} readOnly={readOnly} list={neg ? "finance-exp-concepts" : "finance-inc-concepts"} placeholder="Concepto" onSave={(v) => updateLine(l, { concept: v })} /></td>
        <td className={td}>{cpCell(l)}</td>
        <td className={`${td} text-right`}>{neg && i ? "−" : ""}<NumCell value={l.amount_initial} readOnly={readOnly} onSave={(v) => saveAmount(l, "amount_initial", v)} className={readOnly ? "" : "inline-block w-28"} /></td>
        <td className={`${td} text-right`}>{pctTxt(pctOfIncome(i, fin.initial.ingresos))}</td>
        <td className={`${td} text-right ${F}`}>{neg && f ? "−" : ""}<NumCell value={l.amount_final} readOnly={readOnly} onSave={(v) => saveAmount(l, "amount_final", v)} className={readOnly ? "" : "inline-block w-28"} /></td>
        <td className={`${td} text-right`}>{pctTxt(pctOfIncome(f, fin.final.ingresos))}</td>
        <td className={`${td} text-right`}>{diffTxt(neg ? -(f - i) : f - i)}</td>
        <td className={`${td} text-center`}><Checkbox disabled={readOnly} checked={l.invoice_issued} onCheckedChange={(v) => updateLine(l, { invoice_issued: v === true })} /></td>
        <td className={`${td} text-center`}><Checkbox disabled={readOnly} checked={l.invoice_settled} onCheckedChange={(v) => updateLine(l, { invoice_settled: v === true })} /></td>
        {!readOnly && <td className={td}>{!l.is_sale_price && <ConfirmDeleteButton onConfirm={() => removeLine(l)} title="¿Eliminar esta línea?" />}</td>}
      </tr>
    );
  };
  const totalRow = (label: string, i: number, f: number, neg: boolean) => (
    <tr className="font-semibold">
      <td className={td}>{label}</td><td className={td} />
      <td className={`${td} text-right`}>{signed(i, neg)}</td><td className={`${td} text-right`}>{pctTxt(pctOfIncome(i, fin.initial.ingresos))}</td>
      <td className={`${td} text-right ${F}`}>{signed(f, neg)}</td><td className={`${td} text-right`}>{pctTxt(pctOfIncome(f, fin.final.ingresos))}</td>
      <td className={`${td} text-right`}>{diffTxt(neg ? -(f - i) : f - i)}</td><td className={td} /><td className={td} />{!readOnly && <td className={td} />}
    </tr>
  );
  const bandRow = (label: string, i: number, f: number, last = false) => (
    <tr className="bg-muted font-semibold text-[15px]">
      <td className={td}>{label}</td><td className={td} />
      <td className={`${td} text-right`}>{signed(i, i < 0)}</td><td className={`${td} text-right`}>{pctTxt(pctOfIncome(i, fin.initial.ingresos))}</td>
      <td className={`${td} text-right ${F} ${last ? "border-b border-b-border" : ""}`}>{signed(f, f < 0)}</td><td className={`${td} text-right`}>{pctTxt(pctOfIncome(f, fin.final.ingresos))}</td>
      <td className={`${td} text-right`}>{diffTxt(f - i)}</td><td className={td} /><td className={td} />{!readOnly && <td className={td} />}
    </tr>
  );
  const basisValue = cfg.mode === "fijo" ? "fijo" : cfg.basis;
  const feeRow = (
    <tr className="bg-muted text-[15px]">
      <td className={td}>d. Fee agencia IC</td>
      <td className={td}>
        {readOnly ? (cfg.mode === "fijo" ? "Precio fijo" : cfg.basis === "margen" ? "% s/ margen operativo" : "% s/ ingresos") : (
          <select className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-sm" value={basisValue}
            onChange={(e) => { const v = e.target.value; void updateProd(v === "fijo" ? { ic_fee_mode: "fijo" } : { ic_fee_mode: "pct", commission_basis: v }); }}>
            <option value="precio">% s/ ingresos</option>
            <option value="margen">% s/ margen operativo</option>
            <option value="fijo">Precio fijo</option>
          </select>
        )}
      </td>
      <td className={`${td} text-right`}>{cfg.mode === "fijo"
        ? <span className="inline-flex items-center">−<NumCell value={cfg.fixedInitial} readOnly={readOnly} onSave={(v) => updateProd({ ic_fee_fixed_initial: v })} className={readOnly ? "" : "inline-block w-28 border border-border bg-background"} /></span>
        : signed(fin.initial.fee, true)}</td>
      <td className={`${td} text-right`}>{cfg.mode === "pct" && !readOnly
        ? <PctInput value={cfg.pctInitial} onSave={(v) => updateProd({ ic_fee_pct_initial: v })} />
        : pctTxt(pctOfIncome(fin.initial.fee, fin.initial.ingresos))}</td>
      <td className={`${td} text-right font-semibold ${F}`}>{cfg.mode === "fijo"
        ? <span className="inline-flex items-center">−<NumCell value={cfg.fixedFinal} readOnly={readOnly} onSave={(v) => updateProd({ ic_fee_fixed_final: v })} className={readOnly ? "font-semibold" : "inline-block w-28 border border-border bg-background font-semibold"} /></span>
        : signed(fin.final.fee, true)}</td>
      <td className={`${td} text-right`}>{cfg.mode === "pct" && !readOnly
        ? <PctInput value={cfg.pctFinal} onSave={(v) => updateProd({ ic_commission_pct: v })} />
        : pctTxt(pctOfIncome(fin.final.fee, fin.final.ingresos))}</td>
      <td className={`${td} text-right`}>{diffTxt(-(fin.final.fee - fin.initial.fee))}</td>
      <td className={`${td} text-center font-semibold`}><label className="inline-flex items-center gap-1.5"><Checkbox disabled={readOnly} checked={!!prod?.ic_fee_invoiced} onCheckedChange={(v) => updateProd({ ic_fee_invoiced: v === true })} />Facturado</label></td>
      <td className={`${td} text-center font-semibold`}><label className="inline-flex items-center gap-1.5"><Checkbox disabled={readOnly} checked={!!prod?.ic_fee_paid} onCheckedChange={(v) => updateProd({ ic_fee_paid: v === true })} />Cobrado</label></td>
      {!readOnly && <td className={td} />}
    </tr>
  );

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm tabular-nums">
        <tbody>
          {head("a. Ingresos", "Cliente", "Fra. enviada", "Fra. cobrada", true)}
          {income.map(lineRow)}
          {!readOnly && <tr><td colSpan={4} className={td}><button type="button" className="text-primary" onClick={() => addLine("ingreso")}><Plus className="mr-1 inline h-3.5 w-3.5" />Añadir ingreso</button></td><td className={`${td} ${F}`} /><td colSpan={5} className={td} /></tr>}
          {totalRow("Total ingresos", fin.initial.ingresos, fin.final.ingresos, false)}
          {spacer}
          {head("b. Gastos · Concepto", "Proveedor", "Fra. recibida", "Fra. pagada")}
          {expenses.map(lineRow)}
          {!readOnly && <tr><td colSpan={4} className={td}><button type="button" className="text-primary" onClick={() => addLine("gasto")}><Plus className="mr-1 inline h-3.5 w-3.5" />Añadir gasto</button></td><td className={`${td} ${F}`} /><td colSpan={5} className={td} /></tr>}
          {totalRow("Total gastos", fin.initial.gastos, fin.final.gastos, true)}
          {spacer}
          {bandRow("c. Margen operativo", fin.initial.margen, fin.final.margen)}
          {spacer}
          {feeRow}
          {spacer}
          {bandRow("e. Resultado composer", fin.initial.resultado, fin.final.resultado, true)}
        </tbody>
      </table>
      <SummaryBox fin={fin.final} />
    </div>
  );

  const body = (
    <>
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}><Download className="mr-1 h-4 w-4" />Exportar (Excel / PDF)</Button>
        {!readOnly && <Button size="sm" variant="outline" onClick={() => setOrderOpen(true)}><Mail className="mr-1 h-4 w-4" />Enviar orden de facturación</Button>}
        <Button size="sm" variant="outline" onClick={() => setFull((v) => !v)}>{full ? <><X className="mr-1 h-4 w-4" />Salir de pantalla completa</> : <><Maximize2 className="mr-1 h-4 w-4" />Pantalla completa</>}</Button>
      </div>
      {table}
    </>
  );

  return (
    <>
      <datalist id="finance-cp">{(cpQ.data?.opts ?? []).map((o) => <option key={`${o.type}-${o.id}`} value={o.name}>{TYPE_LABEL[o.type]}</option>)}</datalist>
      <datalist id="finance-inc-concepts">{["Fee composición", "Fee producción", ...(cpQ.data?.incomeConcepts ?? [])].filter((v, i, a) => a.indexOf(v) === i).map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="finance-exp-concepts">{(cpQ.data?.expenseConcepts ?? []).map((c) => <option key={c} value={c} />)}</datalist>
      {full ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-background p-6">
          <h2 className="mb-2 font-display text-2xl">{prod?.title} · Seguimiento económico y financiero</h2>
          {body}
        </div>
      ) : body}
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} title={prod?.title ?? "Producción"} lines={lines} fin={fin} cfg={cfg} />
      {prod && <OrderDialog open={orderOpen} onClose={() => setOrderOpen(false)} prod={prod} lines={lines} fee={fin.final.fee} cfg={cfg} />}
      <ChangeReasonDialog
        pending={pending}
        siblings={[]}
        onCancel={() => setPending(null)}
        onConfirm={async (reason) => { const p = pending; setPending(null); try { await p?.apply(reason); } catch (e: any) { toast.error(e.message); } }}
      />
    </>
  );
}

function PctInput({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [txt, setTxt] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center rounded-sm border border-border bg-background px-1">
      <input className="w-12 bg-transparent text-right outline-none" value={txt ?? (value == null ? "" : String(value).replace(".", ","))}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => { const t = (txt ?? "").trim().replace(",", "."); setTxt(null); const v = t === "" ? null : Number(t); if (v != null && !Number.isFinite(v)) return toast.error("Porcentaje no válido"); if (v !== value) onSave(v); }} />
      <span className="ml-0.5">%</span>
    </span>
  );
}

function SummaryBox({ fin }: { fin: { ingresos: number; gastos: number; fee: number; resultado: number } }) {
  const row = (label: string, v: number, neg: boolean, bold = false): ReactNode => (
    <div className={`flex justify-between gap-6 border-b border-border/60 py-1.5 last:border-0 ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span><span className="tabular-nums">{signed(v, neg)} ({pctTxt(pctOfIncome(v, fin.ingresos))})</span>
    </div>
  );
  return (
    <div className="ml-auto mt-3 w-full max-w-md rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
      <p className="mb-1 font-display text-base">Resumen</p>
      {row("Total ingresos", fin.ingresos, false)}
      {row("Total gastos", fin.gastos, true)}
      {row("Fee agencia", fin.fee, true)}
      {row("Resultado composer", fin.resultado, fin.resultado < 0, true)}
    </div>
  );
}

type Fin = ReturnType<typeof computeFinance>;
function exportRows(lines: FinanceLineRow[], fin: Fin) {
  const out: (string | number)[][] = [];
  const line = (l: FinanceLineRow) => {
    const s = l.kind === "gasto" ? -1 : 1;
    out.push([l.concept, l.counterparty_name ?? "", s * Number(l.amount_initial ?? 0), s * Number(l.amount_final ?? 0), s * (Number(l.amount_final ?? 0) - Number(l.amount_initial ?? 0)), l.invoice_issued ? "Sí" : "No", l.invoice_settled ? "Sí" : "No"]);
  };
  out.push(["a. Ingresos", "Cliente", "Importe inicial", "Importe total", "Diferencia", "Fra. enviada", "Fra. cobrada"]);
  lines.filter((l) => l.kind === "ingreso").forEach(line);
  out.push(["Total ingresos", "", fin.initial.ingresos, fin.final.ingresos, fin.final.ingresos - fin.initial.ingresos, "", ""], []);
  out.push(["b. Gastos · Concepto", "Proveedor", "Importe inicial", "Importe total", "Diferencia", "Fra. recibida", "Fra. pagada"]);
  lines.filter((l) => l.kind === "gasto").forEach(line);
  out.push(["Total gastos", "", -fin.initial.gastos, -fin.final.gastos, -(fin.final.gastos - fin.initial.gastos), "", ""], []);
  out.push(["c. Margen operativo", "", fin.initial.margen, fin.final.margen, fin.final.margen - fin.initial.margen, "", ""], []);
  out.push(["d. Fee agencia IC", "", -fin.initial.fee, -fin.final.fee, -(fin.final.fee - fin.initial.fee), "", ""], []);
  out.push(["e. Resultado composer", "", fin.initial.resultado, fin.final.resultado, fin.final.resultado - fin.initial.resultado, "", ""]);
  return out;
}

function ExportDialog({ open, onClose, title, lines, fin, cfg }: { open: boolean; onClose: () => void; title: string; lines: FinanceLineRow[]; fin: Fin; cfg: IcFeeConfig }) {
  const rows = useMemo(() => exportRows(lines, fin), [lines, fin]);
  const safe = title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "produccion";
  const fmtCell = (c: string | number) => (typeof c === "number" ? `${c < 0 ? "−" : ""}${formatNumberEs(Math.abs(c))} €` : c);
  function xlsx() {
    const ws = XLSX.utils.aoa_to_sheet([[`${title} · Seguimiento económico`], [], ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seguimiento");
    XLSX.writeFile(wb, `${safe} - seguimiento economico.xlsx`);
  }
  function pdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`${title} · Seguimiento económico`, 14, 14);
    autoTable(doc, {
      startY: 20,
      body: rows.map((r) => r.map(fmtCell)),
      styles: { fontSize: 9 },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right", lineWidth: 0.2 }, 4: { halign: "right" } },
      didParseCell: (d) => { const first = String(d.row.raw && (d.row.raw as any)[0] || ""); if (/^(Total|[a-e]\. )/.test(first)) d.cell.styles.fontStyle = "bold"; },
    });
    const y = (doc as any).lastAutoTable.finalY + 8;
    const f = fin.final;
    const pc = (v: number) => pctTxt(pctOfIncome(v, f.ingresos));
    doc.setFontSize(10);
    [["Total ingresos", fmtCell(f.ingresos), pc(f.ingresos)], ["Total gastos", fmtCell(-f.gastos), pc(f.gastos)], ["Fee agencia", fmtCell(-f.fee), pc(f.fee)], ["Resultado composer", fmtCell(f.resultado), pc(f.resultado)]]
      .forEach(([a, b, c], i) => doc.text(`${a}: ${b} (${c})`, 14, y + i * 6));
    doc.save(`${safe} - seguimiento economico.pdf`);
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>Vista previa · {title}</DialogTitle><DialogDescription>Así saldrá el documento. {cfg.mode === "fijo" ? "Fee agencia: precio fijo." : ""}</DialogDescription></DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-sm border border-border">
          <table className="w-full text-xs tabular-nums">
            <tbody>{rows.map((r, i) => (
              <tr key={i} className={/^(Total|[a-e]\. )/.test(String(r[0] ?? "")) ? "font-semibold" : ""}>
                {r.length ? r.map((c, j) => <td key={j} className={`px-2 py-1 ${j >= 2 && j <= 4 ? "text-right" : ""} ${j === 3 ? "border-x border-border bg-muted/30" : ""}`}>{fmtCell(c)}</td>) : <td colSpan={7} className="h-3" />}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button variant="outline" onClick={xlsx}>Descargar Excel</Button>
          <Button onClick={pdf}>Descargar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDialog({ open, onClose, prod, lines, fee, cfg }: { open: boolean; onClose: () => void; prod: FinanceProduction; lines: FinanceLineRow[]; fee: number; cfg: IcFeeConfig }) {
  const client = lines.find((l) => l.is_sale_price)?.counterparty_name || lines.find((l) => l.kind === "ingreso" && l.counterparty_name)?.counterparty_name || "";
  const [concept, setConcept] = useState(`Fee agencia IC · ${prod.title}`);
  const [clientName, setClientName] = useState(client);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const liq = liquidationText(cfg, fee, (v) => `${formatNumberEs(v)} €`);

  async function send() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const me = u.user?.email?.toLowerCase() ?? "";
    const recipients = Array.from(new Set([BILLING_ORDER_RECIPIENT, me].filter(Boolean)));
    const subject = `Orden de facturación · ${prod.title}`;
    const bodyTxt = [`Producción: ${prod.title}`, `Cliente: ${clientName || "—"}`, `Concepto: ${concept}`, `Liquidación: ${liq}`, notes ? `\nObservaciones: ${notes}` : ""].join("\n");
    // Se registra en Facturación (órdenes) cuando el usuario tiene permiso; el email se abre siempre.
    try {
      const { data: number } = await db.rpc("next_billing_order_number");
      if (number && u.user) {
        const { data: order, error } = await db.from("billing_orders").insert({
          order_number: number, status: "enviada", subject, notes: notes || null, total_amount: fee,
          recipient_emails: recipients, created_by: u.user.id, sent_by: u.user.id, sent_at: new Date().toISOString(),
        }).select("id").single();
        if (!error && order) {
          await db.from("billing_order_items").insert({ order_id: order.id, production_id: prod.id, production_title: prod.title, client_name: clientName || null, concept, commission_pct: cfg.mode === "pct" ? cfg.pctFinal : null, commission_amount: fee, position: 0, notes: liq });
          await db.from("billing_order_events").insert({ order_id: order.id, event_type: "enviada", actor_user_id: u.user.id, actor_email: me, details: { production_id: prod.id, liquidation: liq } });
        }
      }
    } catch { /* registro opcional */ }
    window.location.href = `mailto:${recipients.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyTxt)}`;
    setBusy(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Orden de facturación</DialogTitle><DialogDescription>Para {BILLING_ORDER_RECIPIENT}, con copia para ti.</DialogDescription></DialogHeader>
        <div className="grid gap-3 text-sm">
          <div><Label>Producción</Label><Input readOnly value={prod.title} /></div>
          <div><Label>Cliente a quien se factura</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
          <div><Label>Concepto</Label><Input value={concept} onChange={(e) => setConcept(e.target.value)} /></div>
          <div><Label>Liquidación</Label><Input readOnly value={liq} /></div>
          <div><Label>Observaciones</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={busy || !concept.trim()} onClick={send}><Mail className="mr-1 h-4 w-4" />Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
