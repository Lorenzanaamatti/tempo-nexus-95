import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Film } from "lucide-react";
import { EmptyState } from "@/components/list-states";

const db = supabase as any;

/** Películas en las que hemos trabajado con una productora (por vínculo o por nombre escrito en la producción). */
export function PartnerProductions({ companyId, name }: { companyId: string | null; name: string }) {
  const q = useQuery({
    queryKey: ["partner-productions", companyId, name],
    queryFn: async () => {
      const sel = "id, title, year, status, composer:composers!productions_composer_fk(id, full_name)";
      const clean = name.trim().replace(/[%_,()]/g, "");
      const ors = [clean ? `production_company.ilike.${clean}` : null, companyId ? `partner_company_id.eq.${companyId}` : null].filter(Boolean);
      if (!ors.length) return [];
      const { data, error } = await db.from("productions").select(sel).or(ors.join(",")).order("year", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = q.data ?? [];
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando películas…</p>;
  if (q.error) return <p className="text-sm text-destructive">{(q.error as any).message}</p>;
  if (!rows.length) return <EmptyState variant="inline" icon={Film} title="Sin películas" description="Todavía no hay producciones registradas con esta productora." />;
  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-base">
        <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr><th className="px-3 py-2">Película</th><th className="px-3 py-2">Compositor/a</th><th className="px-3 py-2">Año</th><th className="px-3 py-2">Estado</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((p: any) => (
            <tr key={p.id}>
              <td className="px-3 py-2"><Link to="/producciones/$productionId" params={{ productionId: p.id }} className="font-display hover:underline">{p.title}</Link></td>
              <td className="px-3 py-2 text-muted-foreground">{p.composer?.full_name ?? "—"}</td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{p.year ?? "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.status ? String(p.status).replace(/_/g, " ") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
