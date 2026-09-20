import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarMonthGrid, type FlatCalendarEvent } from "@/components/calendar-month-grid";
import { ProductionGanttPanel } from "@/components/production-gantt-panel";
import { isFinalized } from "@/lib/production-lifecycle";
import { CalendarDays, ChevronLeft, ChevronRight, GanttChartSquare } from "lucide-react";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/tareas_/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario general de producciones · Interesante Compañía" },
      {
        name: "description",
        content:
          "Todas las producciones activas con sus subprocesos, en vista Gantt y en vista calendario mensual, con título y compositor.",
      },
      { property: "og:title", content: "Calendario general de producciones" },
      {
        property: "og:description",
        content: "Gantt y calendario mensual de los subprocesos de todas las producciones activas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarioGeneral,
});

type Prod = { id: string; title: string; composerName: string | null; composerId: string | null };

function CalendarioGeneral() {
  const [display, setDisplay] = useState<"calendario" | "gantt">("gantt");
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [composer, setComposer] = useState("all");

  const productionsQ = useQuery({
    queryKey: ["calendario-general-producciones"],
    queryFn: async () => {
      const { data, error } = await db
        .from("productions")
        .select("id, title, status, composer_id, composers:composer_id(id, full_name, artistic_name)")
        .order("title");
      if (error) throw error;
      return ((data ?? []) as any[])
        .filter((p) => !isFinalized(p.status))
        .map<Prod>((p) => ({
          id: p.id,
          title: p.title,
          composerId: p.composer_id ?? null,
          composerName: p.composers ? p.composers.artistic_name || p.composers.full_name : null,
        }));
    },
  });

  const productions = productionsQ.data ?? [];
  const filtered = productions.filter((p) => composer === "all" || p.composerId === composer);
  const ids = filtered.map((p) => p.id);

  const composerOptions = useMemo(() => {
    const map = new Map<string, string>();
    productions.forEach((p) => {
      if (p.composerId && p.composerName) map.set(p.composerId, p.composerName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [productions]);

  const eventsQ = useQuery({
    enabled: display === "calendario" && ids.length > 0,
    queryKey: ["calendario-general-eventos", ids],
    queryFn: async () => {
      const [phases, evSubject, evSource] = await Promise.all([
        db
          .from("production_phases")
          .select("id, production_id, name, detail, start_date, end_date, is_premiere, notes")
          .in("production_id", ids)
          .order("position"),
        db
          .from("calendar_events")
          .select("id, subject_id, source_production_id, source_phase_id, title, note, start_date, end_date, kind")
          .eq("subject_type", "production")
          .in("subject_id", ids),
        db
          .from("calendar_events")
          .select("id, subject_id, source_production_id, source_phase_id, title, note, start_date, end_date, kind")
          .in("source_production_id", ids),
      ]);
      if (phases.error) throw phases.error;

      const meta = new Map(filtered.map((p) => [p.id, p]));
      const toDate = (v: string) => new Date(`${v}T00:00:00`);
      const subjectLabel = (p?: Prod) =>
        p ? `${p.title}${p.composerName ? ` · ${p.composerName}` : ""}` : "Producción";

      const out: FlatCalendarEvent[] = [];

      ((phases.data ?? []) as any[]).forEach((ph) => {
        if (!ph.start_date && !ph.end_date) return;
        const p = meta.get(ph.production_id);
        if (!p) return;
        out.push({
          id: `ph-${ph.id}`,
          start: toDate(ph.start_date ?? ph.end_date),
          end: toDate(ph.end_date ?? ph.start_date),
          kind: ph.is_premiere ? "estreno" : "produccion",
          title: ph.detail ? `${ph.name} (${ph.detail})` : ph.name,
          note: ph.notes,
          category: "producciones",
          subjectLabel: subjectLabel(p),
          subjectGroup: "Producciones activas",
          to: "/producciones/$productionId",
          params: { productionId: p.id },
        });
      });

      const seen = new Set<string>();
      [...((evSubject.data ?? []) as any[]), ...((evSource.data ?? []) as any[])].forEach((e) => {
        if (!e.start_date && !e.end_date) return;
        if (e.source_phase_id) return;
        if (seen.has(e.id)) return;
        seen.add(e.id);
        const pid: string = e.source_production_id ?? e.subject_id;
        const p = meta.get(pid);
        if (!p) return;
        out.push({
          id: `ev-${e.id}`,
          start: toDate(e.start_date ?? e.end_date),
          end: toDate(e.end_date ?? e.start_date),
          kind: e.kind ?? "produccion",
          title: e.title || "Evento",
          note: e.note,
          category: "producciones",
          subjectLabel: subjectLabel(p),
          subjectGroup: "Producciones activas",
          to: "/producciones/$productionId",
          params: { productionId: p.id },
        });
      });

      return out;
    },
  });

  return (
    <div className="mx-auto max-w-[1700px] px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Tareas</p>
        <h1 className="mt-1 font-display text-5xl title-caps">CALENDARIO GENERAL</h1>
        <p className="mt-2 max-w-3xl text-base text-muted-foreground">
          Todas las producciones activas con sus subprocesos, en dos vistas: Gantt y calendario mensual.
          Cada línea indica título de la producción y compositor.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={display === "gantt" ? "default" : "outline"} onClick={() => setDisplay("gantt")}>
          <GanttChartSquare className="mr-1 h-4 w-4" />
          Gantt
        </Button>
        <Button
          size="sm"
          variant={display === "calendario" ? "default" : "outline"}
          onClick={() => setDisplay("calendario")}
        >
          <CalendarDays className="mr-1 h-4 w-4" />
          Calendario
        </Button>
        <Select value={composer} onValueChange={setComposer}>
          <SelectTrigger className="h-9 w-64 text-sm">
            <SelectValue placeholder="Compositor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los compositores</SelectItem>
            {composerOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {display === "calendario" && (
          <div className="ml-auto flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setAnchor(addMonths(anchor, -1))} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-40 text-center font-display text-lg font-semibold capitalize">
              {format(anchor, "LLLL yyyy", { locale: es })}
            </span>
            <Button size="icon" variant="outline" onClick={() => setAnchor(addMonths(anchor, 1))} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAnchor(startOfMonth(new Date()))}>
              Hoy
            </Button>
          </div>
        )}
      </div>

      {productionsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando producciones…</p>
      ) : !ids.length ? (
        <p className="text-sm text-muted-foreground">No hay producciones activas con este filtro.</p>
      ) : display === "gantt" ? (
        <ProductionGanttPanel productionIds={ids} showFilters defaultMode="lineal" />
      ) : eventsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando calendario…</p>
      ) : (
        <CalendarMonthGrid anchor={anchor} events={eventsQ.data ?? []} />
      )}
    </div>
  );
}
