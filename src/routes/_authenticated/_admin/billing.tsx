import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatEUR } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Row = {
  id: string;
  production_id: string;
  sprint_number: number;
  kind: string;
  label: string | null;
  amount: number | null;
  status: string;
  due_date: string | null;
  invoiced_date: string | null;
  paid_date: string | null;
  holded_invoice_ref: string | null;
  holded_url: string | null;
  productions?: { id: string; title: string; composer_id: string | null; composers?: { full_name: string; artistic_name: string | null } | null } | null;
};

export const Route = createFileRoute("/_authenticated/_admin/billing")({
  component: BillingPlan,
});

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  facturado: "Facturado",
  cobrado: "Cobrado",
  cancelado: "Cancelado",
};

function BillingPlan() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "pendiente" | "facturado" | "cobrado" | "vencido">("all");
  const [search, setSearch] = useState("");

  const sprintsQ = useQuery({
    queryKey: ["billing-plan"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_billing_sprints")
        .select("id, production_id, sprint_number, kind, label, amount, status, due_date, invoiced_date, paid_date, holded_invoice_ref, holded_url, productions(id, title, composer_id, composers(full_name, artistic_name))")
        .eq("kind", "comision")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const updateRef = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Row, "holded_invoice_ref" | "holded_url">> }) => {
      const { error } = await (supabase as any).from("production_billing_sprints").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-plan"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });

  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    const list = sprintsQ.data ?? [];
    return list.filter((r) => {
      if (statusFilter === "vencido") {
        if (!(r.due_date && !r.invoiced_date && r.due_date < today)) return false;
      } else if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          r.productions?.title,
          r.productions?.composers?.artistic_name,
          r.productions?.composers?.full_name,
          r.label,
          r.holded_invoice_ref,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sprintsQ.data, statusFilter, search, today]);

  const totals = rows.reduce(
    (acc, r) => {
      const a = Number(r.amount) || 0;
      acc.total += a;
      if (r.invoiced_date) acc.fact += a;
      if (r.paid_date) acc.cob += a;
      if (r.due_date && !r.invoiced_date && r.due_date < today) acc.vencido += a;
      return acc;
    },
    { total: 0, fact: 0, cob: 0, vencido: 0 },
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8">
        <p className="smallcaps text-muted-foreground">Operativo</p>
        <h1 className="font-display text-4xl">Plan de facturación IC</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Facturas de comisión IC pendientes de emitir, emitidas y cobradas. Anota la referencia de la factura en Holded y un enlace directo.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total filtrado" value={formatEUR(totals.total)} />
        <Kpi label="Facturado" value={formatEUR(totals.fact)} accent="primary" />
        <Kpi label="Cobrado" value={formatEUR(totals.cob)} accent="success" />
        <Kpi label="Vencido sin facturar" value={formatEUR(totals.vencido)} accent="warn" />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar producción, compositor, ref…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs"
        />
        <FilterChips
          label="Estado"
          value={statusFilter}
          options={[
            ["all", "Todos"],
            ["pendiente", "Pendiente"],
            ["facturado", "Facturado"],
            ["cobrado", "Cobrado"],
            ["vencido", "Vencido"],
          ]}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
        />
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Producción</th>
              <th className="px-3 py-2">Sprint</th>
              <th className="px-3 py-2 text-right">Importe</th>
              <th className="px-3 py-2">Vencimiento</th>
              <th className="px-3 py-2">Facturado</th>
              <th className="px-3 py-2">Cobrado</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Ref. Holded</th>
              <th className="px-3 py-2">URL Holded</th>
            </tr>
          </thead>
          <tbody>
            {sprintsQ.isLoading ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Sin facturas de comisión con esos filtros.</td></tr>
            ) : (
              rows.map((r) => {
                const vencido = r.due_date && !r.invoiced_date && r.due_date < today;
                return (
                  <tr key={r.id} className={`border-t border-border ${vencido ? "bg-amber-500/5" : ""}`}>
                    <td className="px-3 py-2">
                      <Link to="/productions/$productionId" params={{ productionId: r.production_id }} className="font-display hover:underline">
                        {r.productions?.title ?? "—"}
                      </Link>
                      {r.productions?.composers && (
                        <div className="text-xs text-muted-foreground">
                          {r.productions.composers.artistic_name || r.productions.composers.full_name}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">#{r.sprint_number}{r.label ? ` · ${r.label}` : ""}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatEUR(r.amount)}</td>
                    <td className={`px-3 py-2 ${vencido ? "text-amber-600 dark:text-amber-400" : ""}`}>{r.due_date ?? "—"}</td>
                    <td className="px-3 py-2">{r.invoiced_date ?? "—"}</td>
                    <td className="px-3 py-2">{r.paid_date ?? "—"}</td>
                    <td className="px-3 py-2">{STATUS_LABEL[r.status] ?? r.status}</td>
                    <td className="px-3 py-2">
                      <Input
                        defaultValue={r.holded_invoice_ref ?? ""}
                        placeholder="F-2026-…"
                        className="h-8 w-32 text-xs"
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          if (v !== (r.holded_invoice_ref ?? null)) updateRef.mutate({ id: r.id, patch: { holded_invoice_ref: v } });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          defaultValue={r.holded_url ?? ""}
                          placeholder="https://app.holded.com/…"
                          className="h-8 w-44 text-xs"
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== (r.holded_url ?? null)) updateRef.mutate({ id: r.id, patch: { holded_url: v } });
                          }}
                        />
                        {r.holded_url && (
                          <a href={r.holded_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "primary" | "success" | "warn" }) {
  const ring = accent === "primary" ? "border-primary/40" : accent === "success" ? "border-emerald-500/40" : accent === "warn" ? "border-amber-500/50" : "border-border";
  return (
    <div className={`rounded-sm border ${ring} bg-card p-3`}>
      <div className="smallcaps text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl tabular-nums">{value}</div>
    </div>
  );
}

function FilterChips({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="smallcaps text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1 rounded-sm border border-border p-1">
        {options.map(([v, l]) => (
          <Button
            key={v}
            size="sm"
            variant={value === v ? "default" : "ghost"}
            onClick={() => onChange(v)}
            className="h-7 px-3 text-xs"
          >
            {l}
          </Button>
        ))}
      </div>
    </div>
  );
}