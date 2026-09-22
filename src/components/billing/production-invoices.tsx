import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { formatDateEs } from "@/lib/dates";
import { Money } from "@/components/money";

type Row = { id: string; invoice_number: string | null; issue_date: string; concept: string | null; client_name: string | null; amount: number | null; status: string; paid_date: string | null };

const LABEL: Record<string, string> = { emitida: "Emitida", cobrada: "Cobrada", anulada: "Anulada" };

export function ProductionInvoices({ productionId }: { productionId: string }) {
  const q = useQuery({
    queryKey: ["production-invoices", productionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("billing_invoices")
        .select("id,invoice_number,issue_date,concept,client_name,amount,status,paid_date")
        .eq("production_id", productionId)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const rows = q.data ?? [];
  return <div>
    {q.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">Todavía no hay facturas registradas para esta producción.</p>
    ) : (
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="p-3">Nº</th><th className="p-3">Fecha</th><th className="p-3">Cliente</th><th className="p-3">Concepto</th><th className="p-3 text-right">Importe</th><th className="p-3">Estado</th><th className="p-3">Cobro</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id} className="border-t border-border">
            <td className="p-3 font-mono">{r.invoice_number || "Sin nº"}</td>
            <td className="p-3">{formatDateEs(r.issue_date)}</td>
            <td className="p-3">{r.client_name || "—"}</td>
            <td className="p-3">{r.concept || "—"}</td>
            <td className="p-3 text-right"><Money value={Number(r.amount) || 0} /></td>
            <td className="p-3">{LABEL[r.status] ?? r.status}</td>
            <td className="p-3">{r.paid_date ? formatDateEs(r.paid_date) : "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    )}
    <p className="mt-3 text-sm"><Link to="/billing" className="underline">Ir al historial completo de facturas</Link></p>
  </div>;
}
