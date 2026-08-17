import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateEs } from "@/lib/dates";
import { PRODUCTION_KIND_LABEL, PRODUCTION_STATUS_LABEL, type ProductionKind } from "@/lib/production-constants";
import { PRODUCTION_STAGE_LABEL, PRODUCTION_STAGE_TONE, stageOf } from "@/lib/production-lifecycle";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { Clapperboard, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export const PRODUCTION_SELECT =
  "id, title, project_type, kind, status, year, delivery_date, premiere_date, created_at, partner, production_company, partner_company_id, platform, composer_id, composers(full_name, artistic_name), partner_company:production_companies(name)";

export type ProductionRecord = {
  id: string;
  title: string;
  project_type: ProductionKind | null;
  kind: string | null;
  status: string | null;
  year: number | null;
  delivery_date: string | null;
  premiere_date: string | null;
  created_at: string;
  partner: string | null;
  production_company: string | null;
  platform: string | null;
  composers?: { full_name: string | null; artistic_name: string | null } | null;
  partner_company?: { name: string | null } | null;
};

export function useProductions() {
  return useQuery({
    queryKey: ["productions-lifecycle"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("productions")
        .select(PRODUCTION_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductionRecord[];
    },
  });
}

export function composerName(p: ProductionRecord) {
  return p.composers?.artistic_name || p.composers?.full_name || "—";
}

export function clientName(p: ProductionRecord) {
  return p.partner_company?.name || p.production_company || p.partner || p.platform || "—";
}

export function StageBadge({ status }: { status: string | null }) {
  const stage = stageOf(status);
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${PRODUCTION_STAGE_TONE[stage]}`}
      title={status ? PRODUCTION_STATUS_LABEL[status as keyof typeof PRODUCTION_STATUS_LABEL] ?? status : undefined}
    >
      {PRODUCTION_STAGE_LABEL[stage]}
    </span>
  );
}

export function ProductionsTable({ rows, showFinishDate = false }: { rows: ProductionRecord[]; showFinishDate?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 smallcaps text-xs">Título</th>
            <th className="px-3 py-2 smallcaps text-xs">Compositor</th>
            <th className="px-3 py-2 smallcaps text-xs">Cliente / Partner</th>
            <th className="px-3 py-2 smallcaps text-xs">Inicio</th>
            <th className="px-3 py-2 smallcaps text-xs">Entrega prevista</th>
            {showFinishDate && <th className="px-3 py-2 smallcaps text-xs">Fecha finalización</th>}
            <th className="px-3 py-2 smallcaps text-xs">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30">
              <td className="px-3 py-2">
                <Link to="/producciones/$productionId" params={{ productionId: p.id }} className="font-display hover:underline">{p.title}</Link>
                {p.project_type && <span className="ml-2 text-xs text-muted-foreground">{PRODUCTION_KIND_LABEL[p.project_type]}</span>}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{composerName(p)}</td>
              <td className="px-3 py-2 text-muted-foreground">{clientName(p)}</td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateEs(p.created_at)}</td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateEs(p.delivery_date)}</td>
              {showFinishDate && (
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateEs(p.premiere_date ?? p.delivery_date)}</td>
              )}
              <td className="px-3 py-2"><StageBadge status={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function YearGroupedProductions({ rows }: { rows: ProductionRecord[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, ProductionRecord[]>();
    for (const p of rows) {
      const iso = p.premiere_date ?? p.delivery_date;
      const year = p.year ? String(p.year) : iso ? iso.slice(0, 4) : "Sin año";
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(p);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      {groups.map(([year, items]) => {
        const isCollapsed = collapsed[year];
        return (
          <section key={year}>
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [year]: !c[year] }))}
              className="mb-2 flex items-center gap-2 font-display text-2xl title-caps"
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              {year}
              <span className="text-sm text-muted-foreground tabular-nums">({items.length})</span>
            </button>
            {!isCollapsed && <ProductionsTable rows={items} showFinishDate />}
          </section>
        );
      })}
    </div>
  );
}

export function ProductionSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Buscar título…" className="w-56 rounded-sm" />;
}

export { Clapperboard, ListSkeleton, EmptyState };
