import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { ExportRowsButton } from "@/components/export-rows-button";
import { Check, X, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR0 } from "@/lib/money";
import { isFinalized, PRODUCTION_STAGE_LABEL, stageOf } from "@/lib/production-lifecycle";

const db = supabase as any;

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function Flag({ ok, extra }: { ok: boolean; extra?: string | null }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", ok ? "text-emerald-600" : "text-destructive")}>
      {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      {ok && extra ? <span className="tabular-nums text-foreground">{extra}</span> : null}
    </span>
  );
}

function useSeguimiento() {
  return useQuery({
    queryKey: ["produccion-seguimiento"],
    queryFn: async () => {
      const [prods, sprints, memos, contracts, docs, closures] = await Promise.all([
        db
          .from("productions")
          .select(
            "id, title, status, start_date, created_at, updated_at, fee_amount, composer_id, partner_company_id, production_company, composers:composer_id(id, full_name), partner_company:production_companies(id, name)",
          ),
        db.from("production_billing_sprints").select("production_id, amount, invoiced_date, paid_date, status"),
        db.from("deal_memos").select("id, production_id"),
        db.from("contracts").select("id, production_id, sign_status"),
        db.from("production_documents").select("production_id, kind, title"),
        db.from("production_closures").select("production_id, presupuesto_ok, deal_memo_id, contrato_id"),
      ]);
      if (prods.error) throw prods.error;

      const group = <T extends { production_id: string | null }>(rows: T[] | null) => {
        const m = new Map<string, T[]>();
        for (const r of rows ?? []) {
          if (!r.production_id) continue;
          const arr = m.get(r.production_id) ?? [];
          arr.push(r);
          m.set(r.production_id, arr);
        }
        return m;
      };
      const sprintsBy = group(sprints.data);
      const memosBy = group(memos.data);
      const contractsBy = group(contracts.data);
      const docsBy = group(docs.data);
      const closureBy = new Map<string, any>((closures.data ?? []).map((c: any) => [c.production_id, c]));

      return (prods.data ?? [])
        .filter((p: any) => !isFinalized(p.status))
        .map((p: any) => {
          const ss = sprintsBy.get(p.id) ?? [];
          const invoiced = ss.filter((s: any) => s.invoiced_date);
          const paid = ss.filter((s: any) => s.paid_date);
          const invoicedAmount = invoiced.reduce((a: number, s: any) => a + Number(s.amount ?? 0), 0);
          const paidAmount = paid.reduce((a: number, s: any) => a + Number(s.amount ?? 0), 0);
          const closure = closureBy.get(p.id);
          const hasPresupuesto =
            Boolean(closure?.presupuesto_ok) ||
            (docsBy.get(p.id) ?? []).some((d: any) => /presupuesto/i.test(`${d.kind ?? ""} ${d.title ?? ""}`));
          const hasDealMemo = Boolean(closure?.deal_memo_id) || (memosBy.get(p.id) ?? []).length > 0;
          const hasContrato =
            Boolean(closure?.contrato_id) ||
            (contractsBy.get(p.id) ?? []).some((c: any) => c.sign_status === "firmado" || c.sign_status === "signed");

          const overdueInvoice = invoiced.some((s: any) => {
            if (s.paid_date) return false;
            const d = daysSince(s.invoiced_date);
            return d != null && d > 30;
          });
          const stale = (daysSince(p.updated_at) ?? 0) > 60;

          return {
            id: p.id,
            title: p.title as string,
            cliente: p.partner_company?.name ?? p.production_company ?? null,
            representado: p.composers?.full_name ?? null,
            stage: stageOf(p.status),
            hasPresupuesto,
            hasDealMemo,
            hasContrato,
            invoiced: invoiced.length > 0,
            invoicedAmount,
            paid: paid.length > 0,
            paidAmount,
            diasActiva: daysSince(p.start_date ?? p.created_at) ?? 0,
            alerta: overdueInvoice ? "roja" : stale ? "naranja" : null,
          };
        })
        .sort((a: any, b: any) => {
          const rank = (x: any) => (x.alerta === "roja" ? 0 : x.alerta === "naranja" ? 1 : 2);
          return rank(a) - rank(b) || b.diasActiva - a.diasActiva;
        });
    },
  });
}

function SeguimientoPage() {
  const listQ = useSeguimiento();
  const [estado, setEstado] = useState("todos");
  const [representado, setRepresentado] = useState("todos");
  const [cliente, setCliente] = useState("todos");

  const data = listQ.data ?? [];
  const uniq = (key: "representado" | "cliente") =>
    [...new Set(data.map((r: any) => r[key]).filter(Boolean))].sort((a: any, b: any) => String(a).localeCompare(String(b), "es"));

  const rows = useMemo(
    () =>
      data.filter((r: any) => {
        if (estado !== "todos" && r.stage !== estado) return false;
        if (representado !== "todos" && r.representado !== representado) return false;
        if (cliente !== "todos" && r.cliente !== cliente) return false;
        return true;
      }),
    [data, estado, representado, cliente],
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Producciones</p>
          <h1 className="mt-1 font-display text-5xl title-caps">SEGUIMIENTO</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Vista operativa de todas las producciones activas con estado documental y de cobro en una sola pantalla.
          </p>
        </div>
        <ExportRowsButton rows={rows} filename="produccion-seguimiento" sheetName="Seguimiento" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(PRODUCTION_STAGE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={representado} onValueChange={setRepresentado}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los representados</SelectItem>
            {uniq("representado").map((v: any) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cliente} onValueChange={setCliente}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los clientes</SelectItem>
            {uniq("cliente").map((v: any) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {listQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : !rows.length ? (
        <EmptyState icon={Clapperboard} title="Sin producciones activas" description="No hay producciones activas que coincidan con los filtros." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {["Producción", "Cliente", "Representado", "Estado", "Presupuesto", "Deal Memo", "Contrato", "Factura emitida", "Cobrado", "Días activa", "Alerta"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 smallcaps text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-display">
                    <Link to="/producciones/$productionId" params={{ productionId: r.id }} className="hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.cliente ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.representado ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] smallcaps">
                      {(PRODUCTION_STAGE_LABEL as any)[r.stage]}
                    </span>
                  </td>
                  <td className="px-3 py-2"><Flag ok={r.hasPresupuesto} /></td>
                  <td className="px-3 py-2"><Flag ok={r.hasDealMemo} /></td>
                  <td className="px-3 py-2"><Flag ok={r.hasContrato} /></td>
                  <td className="px-3 py-2"><Flag ok={r.invoiced} extra={formatEUR0(r.invoicedAmount)} /></td>
                  <td className="px-3 py-2"><Flag ok={r.paid} extra={formatEUR0(r.paidAmount)} /></td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.diasActiva}</td>
                  <td className="px-3 py-2">
                    {r.alerta === "roja" ? (
                      <span className="rounded-sm bg-destructive px-1.5 py-0.5 text-[10px] smallcaps text-destructive-foreground">Factura vencida</span>
                    ) : r.alerta === "naranja" ? (
                      <span className="rounded-sm bg-amber-500 px-1.5 py-0.5 text-[10px] smallcaps text-white">Sin movimiento</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/_admin/producciones/seguimiento")({
  component: SeguimientoPage,
});