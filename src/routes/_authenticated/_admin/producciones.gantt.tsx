import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { ProductionGanttPanel } from "@/components/production-gantt-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/list-states";
import { CalendarRange } from "lucide-react";
import { isFinalized } from "@/lib/production-lifecycle";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/producciones/gantt")({
  head: () => ({
    meta: [
      { title: "Gantt de producciones · Interesante Compañía" },
      { name: "description", content: "Calendario estratificado de las producciones en curso: fases, responsables, estados y solapes." },
      { property: "og:title", content: "Gantt de producciones" },
      { property: "og:description", content: "Fases, responsables y solapes de las producciones en curso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GanttPage,
});

function GanttPage() {
  const [composer, setComposer] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["gantt-productions-activas"],
    queryFn: async () => {
      const { data, error } = await db
        .from("productions")
        .select("id, title, status, composer_id, composers:composer_id(id, full_name)")
        .order("title");
      if (error) throw error;
      return ((data ?? []) as any[]).filter((p) => !isFinalized(p.status));
    },
  });

  const composers = useMemo(() => {
    const map = new Map<string, string>();
    (data ?? []).forEach((p) => {
      if (p.composers?.id) map.set(p.composers.id, p.composers.full_name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [data]);

  const ids = (data ?? [])
    .filter((p) => composer === "all" || p.composer_id === composer)
    .map((p) => p.id);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Gantt de producciones"
        description="Qué se espera de cada parte y cuándo. Vista desplegada por responsable o lineal, una producción debajo de otra, para detectar solapes."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={composer} onValueChange={setComposer}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Representado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los representados</SelectItem>
            {composers.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{ids.length} producciones en curso</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !ids.length ? (
        <EmptyState icon={CalendarRange} title="Sin producciones en curso" description="Cuando haya producciones activas con fases planificadas, aparecerán aquí." />
      ) : (
        <ProductionGanttPanel productionIds={ids} defaultMode="lineal" />
      )}
    </div>
  );
}
