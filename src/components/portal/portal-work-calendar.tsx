import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductionGanttPanel } from "@/components/production-gantt-panel";
import { GANTT_OWNER_LABEL, type GanttOwner } from "@/components/production-gantt";
import { fetchComposerProductions } from "@/lib/composer-productions";
import { normalizeMilestoneStatus } from "@/lib/production-milestones";
import { formatDateEs } from "@/lib/dates";

type Zoom = "dia" | "semana" | "mes" | "anio";
const ZOOM_LABEL: Record<Zoom, string> = { dia: "Día", semana: "Semana", mes: "Mes", anio: "Año" };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function range(zoom: Zoom, anchor: Date): [Date, Date] {
  const a = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (zoom === "dia") return [a, a];
  if (zoom === "semana") {
    const s = new Date(a); s.setDate(a.getDate() - ((a.getDay() + 6) % 7));
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return [s, e];
  }
  return [new Date(a.getFullYear(), a.getMonth(), 1), new Date(a.getFullYear(), a.getMonth() + 1, 0)];
}

/** Calendario de trabajo del portal: Día / Semana / Mes (solo lo activo en el periodo) o Año (Gantt). */
export function PortalWorkCalendar({ composerId }: { composerId: string }) {
  const [zoom, setZoom] = useState<Zoom>("semana");
  const [anchor, setAnchor] = useState(() => new Date());
  const [from, to] = range(zoom, anchor);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-work-calendar", composerId],
    queryFn: async () => {
      const prods = await fetchComposerProductions<{ id: string; title: string; gantt_color: string | null }>(composerId, "id, title, gantt_color");
      if (!prods.length) return [];
      const { data: phases, error } = await supabase.from("production_phases")
        .select("id, production_id, name, owner, start_date, end_date, status, is_milestone")
        .in("production_id", prods.map((p) => p.id));
      if (error) throw error;
      const byId = new Map(prods.map((p) => [p.id, p]));
      return (phases ?? []).map((ph) => ({ ...ph, production: byId.get(ph.production_id)! }));
    },
  });

  const groups = useMemo(() => {
    const f = iso(from), t = iso(to);
    const active = (data ?? []).filter((ph) => {
      const s = ph.start_date ?? ph.end_date, e = ph.end_date ?? ph.start_date;
      return s && e && s <= t && e >= f;
    });
    const map = new Map<string, { title: string; color: string | null; rows: typeof active }>();
    for (const ph of active.sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""))) {
      const g = map.get(ph.production_id) ?? { title: ph.production.title, color: ph.production.gantt_color, rows: [] };
      g.rows.push(ph); map.set(ph.production_id, g);
    }
    return Array.from(map.values());
  }, [data, from.getTime(), to.getTime()]);

  function move(dir: 1 | -1) {
    const d = new Date(anchor);
    if (zoom === "dia") d.setDate(d.getDate() + dir);
    else if (zoom === "semana") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  }

  const periodLabel = zoom === "dia" ? formatDateEs(iso(from))
    : zoom === "semana" ? `${formatDateEs(iso(from))} – ${formatDateEs(iso(to))}`
    : from.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(ZOOM_LABEL) as Zoom[]).map((z) => (
          <Button key={z} size="sm" variant={zoom === z ? "default" : "outline"} onClick={() => setZoom(z)}>{ZOOM_LABEL[z]}</Button>
        ))}
        {zoom !== "anio" && (
          <div className="ml-auto flex items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="Periodo anterior" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setAnchor(new Date())}>Hoy</Button>
            <Button size="icon" variant="ghost" aria-label="Periodo siguiente" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
            <span className="min-w-40 text-right text-sm font-medium capitalize">{periodLabel}</span>
          </div>
        )}
      </div>
      {zoom === "anio" ? (
        <ProductionGanttPanel composerId={composerId} />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando calendario…</p>
      ) : !groups.length ? (
        <p className="rounded-sm border border-border p-4 text-sm text-muted-foreground">No hay fases activas en este periodo.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.title} className="overflow-hidden rounded-sm border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color ?? "var(--muted-foreground)" }} aria-hidden />
                <p className="font-display">{g.title}</p>
              </div>
              <ul>
                {g.rows.map((ph) => {
                  const late = normalizeMilestoneStatus(ph.status) === "retrasado";
                  return (
                    <li key={ph.id} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/60 px-3 py-2 last:border-b-0 ${late ? "bg-destructive/5" : ""}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{ph.name}</p>
                        <p className="text-xs text-muted-foreground">{GANTT_OWNER_LABEL[ph.owner as GanttOwner] ?? ph.owner ?? ""}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs">
                        {late && <span className="inline-flex items-center gap-1 rounded-sm bg-destructive px-1.5 py-0.5 font-semibold text-destructive-foreground"><AlertTriangle className="h-3 w-3" aria-hidden />Retrasado</span>}
                        <span className="tabular-nums text-muted-foreground">{formatDateEs(ph.start_date)}{ph.end_date && ph.end_date !== ph.start_date ? ` – ${formatDateEs(ph.end_date)}` : ""}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
