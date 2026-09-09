import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductionGantt, type GanttPhase, type GanttOwner } from "@/components/production-gantt";
import { Rows3, LayoutList } from "lucide-react";

const db = supabase as any;

async function loadProductionIds(opts: { productionIds?: string[]; composerId?: string }) {
  if (opts.productionIds) return opts.productionIds;
  if (!opts.composerId) return [];
  const [direct, assigned] = await Promise.all([
    db.from("productions").select("id").eq("composer_id", opts.composerId),
    db.from("production_assignments").select("production_id").eq("composer_id", opts.composerId),
  ]);
  const ids = new Set<string>();
  ((direct.data ?? []) as any[]).forEach((r) => ids.add(r.id));
  ((assigned.data ?? []) as any[]).forEach((r) => r.production_id && ids.add(r.production_id));
  return Array.from(ids);
}

export function ProductionGanttPanel({
  productionIds,
  composerId,
  defaultMode = "desplegado",
  showModeToggle = true,
}: {
  productionIds?: string[];
  composerId?: string;
  defaultMode?: "desplegado" | "lineal";
  showModeToggle?: boolean;
}) {
  const [mode, setMode] = useState<"desplegado" | "lineal">(defaultMode);

  const { data, isLoading } = useQuery({
    queryKey: ["gantt-phases", productionIds ?? null, composerId ?? null],
    queryFn: async () => {
      const ids = await loadProductionIds({ productionIds, composerId });
      if (!ids.length) return [] as GanttPhase[];
      const [{ data: prods }, { data: phases }] = await Promise.all([
        db.from("productions").select("id, title").in("id", ids),
        db
          .from("production_phases")
          .select("id, production_id, name, owner, start_date, end_date, status, notes, position")
          .in("production_id", ids)
          .order("position"),
      ]);
      const titles = new Map<string, string>(((prods ?? []) as any[]).map((p) => [p.id, p.title]));
      return ((phases ?? []) as any[])
        .filter((p) => p.start_date && p.end_date)
        .map((p) => ({
          id: p.id,
          name: p.name,
          owner: (p.owner ?? "agencia") as GanttOwner,
          start: p.start_date,
          end: p.end_date,
          status: (p.status ?? "planificada") as GanttPhase["status"],
          note: p.notes,
          milestone: p.start_date === p.end_date,
          productionId: p.production_id,
          productionTitle: titles.get(p.production_id) ?? "Producción",
        })) as GanttPhase[];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando calendario…</p>;

  return (
    <div className="space-y-3">
      {showModeToggle && (
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "desplegado" ? "default" : "outline"} onClick={() => setMode("desplegado")}>
            <LayoutList className="mr-1 h-4 w-4" />Desplegado
          </Button>
          <Button size="sm" variant={mode === "lineal" ? "default" : "outline"} onClick={() => setMode("lineal")}>
            <Rows3 className="mr-1 h-4 w-4" />Lineal
          </Button>
        </div>
      )}
      <ProductionGantt phases={data ?? []} mode={mode} />
    </div>
  );
}
