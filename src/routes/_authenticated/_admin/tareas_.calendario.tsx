import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, endOfYear, format, startOfMonth, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarMonthGrid, type FlatCalendarEvent } from "@/components/calendar-month-grid";
import { ProductionGanttPanel } from "@/components/production-gantt-panel";
import { CalendarExportButton, type CalendarExportRow } from "@/components/calendar-export-button";
import { GANTT_OWNER_LABEL, type GanttOwner, type GanttPhase } from "@/components/production-gantt";
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
  const [production, setProduction] = useState("all");
  const [type, setType] = useState("all");
  const [section, setSection] = useState<"all" | GanttOwner>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ganttRows, setGanttRows] = useState<Array<GanttPhase & { composerName?: string | null }>>([]);

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
  const filtered = productions.filter((p) => (composer === "all" || p.composerId === composer) && (production === "all" || p.id === production));
  const ids = filtered.map((p) => p.id);

  const composerOptions = useMemo(() => {
    const map = new Map<string, string>();
    productions.forEach((p) => {
      if (p.composerId && p.composerName) map.set(p.composerId, p.composerName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [productions]);

  const eventsQ = useQuery({
    enabled: ids.length > 0,
    queryKey: ["calendario-general-eventos", ids],
    queryFn: async () => {
      const [phases, evSubject, evSource] = await Promise.all([
        db
          .from("production_phases")
          .select("id, production_id, name, detail, owner, start_date, end_date, is_premiere, notes")
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
           area: ph.owner ?? "agencia",
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
           area: "agencia",
          subjectLabel: subjectLabel(p),
          subjectGroup: "Producciones activas",
          to: "/producciones/$productionId",
          params: { productionId: p.id },
        });
      });

      return out;
    },
  });

  const rawEvents = eventsQ.data ?? [];
  const typeOptions = useMemo(() => Array.from(new Set([
    ...rawEvents.map((event) => event.title ?? event.kind),
    ...ganttRows.map((row) => row.name),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, "es")), [rawEvents, ganttRows]);

  const visibleEvents = useMemo(() => rawEvents.filter((event) =>
    (type === "all" || (event.title ?? event.kind).trim().toLowerCase() === type.trim().toLowerCase()) &&
    (section === "all" || event.area === section) &&
    (!dateFrom || format(event.end, "yyyy-MM-dd") >= dateFrom) &&
    (!dateTo || format(event.start, "yyyy-MM-dd") <= dateTo)
  ), [rawEvents, type, section, dateFrom, dateTo]);

  const exportRows = useMemo<CalendarExportRow[]>(() => display === "gantt"
    ? ganttRows.map((row) => ({ production: row.productionTitle ?? "Producción", client: row.productionClient ?? "", person: row.composerName ?? "", section: GANTT_OWNER_LABEL[row.owner], type: row.name, start: row.start, end: row.end, notes: row.note ?? "" }))
    : visibleEvents.map((event) => { const [productionTitle, person = ""] = event.subjectLabel.split(" · "); return { production: productionTitle, client: "", person, section: event.area ? GANTT_OWNER_LABEL[event.area as GanttOwner] ?? event.area : "Agencia", type: event.title ?? event.kind, start: format(event.start, "yyyy-MM-dd"), end: format(event.end, "yyyy-MM-dd"), notes: event.note ?? "" }; }),
    [display, ganttRows, visibleEvents]);

  const exportSummary = [dateFrom || dateTo ? `${dateFrom || "inicio"} a ${dateTo || "fin"}` : "Todos los periodos", composer === "all" ? "Todas las personas" : composerOptions.find(([id]) => id === composer)?.[1], production === "all" ? "Todas las producciones" : productions.find((item) => item.id === production)?.title, type === "all" ? "Todos los tipos" : type, section === "all" ? "Todas las secciones" : GANTT_OWNER_LABEL[section]].filter(Boolean).join(" · ");
  const receiveGanttRows = useCallback((rows: Array<GanttPhase & { composerName?: string | null }>) => setGanttRows(rows), []);

  function applyPeriod(period: string) {
    const now = new Date();
    if (period === "all") { setDateFrom(""); setDateTo(""); return; }
    if (period === "month") { setDateFrom(format(startOfMonth(now), "yyyy-MM-dd")); setDateTo(format(endOfMonth(now), "yyyy-MM-dd")); return; }
    if (period === "year") { setDateFrom(format(startOfYear(now), "yyyy-MM-dd")); setDateTo(format(endOfYear(now), "yyyy-MM-dd")); return; }
    const days = period === "30" ? 30 : period === "90" ? 90 : 180;
    setDateFrom(format(now, "yyyy-MM-dd")); setDateTo(format(addDays(now, days), "yyyy-MM-dd"));
  }

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
        <Select value={production} onValueChange={setProduction}><SelectTrigger className="h-9 w-56 text-sm"><SelectValue placeholder="Producción" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las producciones</SelectItem>{productions.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select>
        <Select value={type} onValueChange={setType}><SelectTrigger className="h-9 w-52 text-sm"><SelectValue placeholder="Tipo / proceso" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los tipos</SelectItem>{typeOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Select value={section} onValueChange={(value) => setSection(value as "all" | GanttOwner)}><SelectTrigger className="h-9 w-52 text-sm"><SelectValue placeholder="Sección" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las secciones</SelectItem>{(Object.keys(GANTT_OWNER_LABEL) as GanttOwner[]).map((owner) => <SelectItem key={owner} value={owner}>{GANTT_OWNER_LABEL[owner]}</SelectItem>)}</SelectContent></Select>
        <Select onValueChange={applyPeriod}><SelectTrigger className="h-9 w-48 text-sm"><SelectValue placeholder="Periodo" /></SelectTrigger><SelectContent><SelectItem value="all">Todo el calendario</SelectItem><SelectItem value="month">Mes actual</SelectItem><SelectItem value="30">Próximos 30 días</SelectItem><SelectItem value="90">Próximos 90 días</SelectItem><SelectItem value="180">Próximos 6 meses</SelectItem><SelectItem value="year">Año actual</SelectItem></SelectContent></Select>
        <label className="flex h-9 items-center gap-2 border border-input bg-background px-2 text-xs"><span>Desde</span><input type="date" className="bg-transparent" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label className="flex h-9 items-center gap-2 border border-input bg-background px-2 text-xs"><span>Hasta</span><input type="date" className="bg-transparent" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <CalendarExportButton rows={exportRows} view={display === "gantt" ? "Gantt" : "Calendario"} summary={exportSummary} />
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
         <ProductionGanttPanel productionIds={ids} defaultMode="lineal" externalOwner={section} externalType={type} dateFrom={dateFrom} dateTo={dateTo} onFilteredRowsChange={receiveGanttRows} />
      ) : eventsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando calendario…</p>
      ) : (
         <CalendarMonthGrid anchor={anchor} events={visibleEvents} />
      )}
    </div>
  );
}
