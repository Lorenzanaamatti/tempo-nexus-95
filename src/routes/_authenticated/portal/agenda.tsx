import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { KanbanSquare, CalendarDays, GanttChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { CalendarKanban } from "@/components/calendar-kanban";
import { CalendarMonthGrid, type FlatCalendarEvent } from "@/components/calendar-month-grid";
import { TimelineCalendar } from "@/components/timeline-calendar";
import { computeRange, stepAnchor, rangeLabel, VIEW_LABELS, type CalendarView, type TimelineRow } from "@/lib/calendar-api";
import { KIND_FAMILY } from "@/lib/calendar-sources";
import type { AvailabilityKind } from "@/components/availability-editor";
import type { ExtraKind } from "@/lib/calendar-sources";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/portal/agenda")({
  component: Agenda,
});

type AgendaEvent = {
  id: string;
  title: string | null;
  note: string | null;
  kind: string;
  start_date: string;
  end_date: string | null;
  subject_type: string;
};

const FAMILY_TO_CATEGORY: Record<string, string> = {
  people: "personal",
  productions: "operativo",
  billing: "facturacion",
  opportunities: "marketing",
  contracts: "operativo",
  tasks: "operativo",
};

function Agenda() {
  const { composerId } = usePortalComposer();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-agenda", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const [{ data: person }, { data: prods }] = await Promise.all([
        supabase.from("people").select("id").eq("composer_id", composerId!).maybeSingle(),
        (supabase as any).from("productions").select("id").eq("composer_id", composerId!),
      ]);
      const subjects: { type: string; id: string }[] = [
        { type: "composer", id: composerId! },
      ];
      if (person?.id) subjects.push({ type: "person", id: person.id });
      for (const p of (prods ?? []) as { id: string }[]) subjects.push({ type: "production", id: p.id });

      const results = await Promise.all(
        subjects.map((s) =>
          supabase
            .from("calendar_events")
            .select("id, title, note, kind, start_date, end_date, subject_type")
            .eq("subject_type", s.type as any)
            .eq("subject_id", s.id),
        ),
      );
      const seen = new Set<string>();
      const data: AgendaEvent[] = [];
      for (const r of results) {
        for (const ev of r.data ?? []) {
          if (seen.has(ev.id)) continue;
          seen.add(ev.id);
          data.push(ev as AgendaEvent);
        }
      }
      data.sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
      const today = new Date().toISOString().slice(0, 10);
      const all = data;
      return {
        all,
        upcoming: all.filter((e) => (e.end_date ?? e.start_date) >= today),
        past: all
          .filter((e) => (e.end_date ?? e.start_date) < today && e.note)
          .reverse(),
      };
    },
  });

  const [tab, setTab] = useState<"kanban" | "calendar" | "gantt">("kanban");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [view, setView] = useState<CalendarView>("month");

  const flat: FlatCalendarEvent[] = useMemo(() => {
    const all = data?.all ?? [];
    return all.map((e) => {
      const family = KIND_FAMILY[e.kind] ?? "tasks";
      const subjectLabel =
        e.subject_type === "production" ? "Producción" :
        e.subject_type === "person" ? "Persona" :
        e.subject_type === "composer" ? "Compositor" : e.subject_type;
      return {
        id: e.id,
        start: new Date(e.start_date),
        end: new Date(e.end_date ?? e.start_date),
        kind: e.kind,
        title: e.title ?? undefined,
        note: e.note,
        category: FAMILY_TO_CATEGORY[family] ?? "operativo",
        subjectLabel,
        subjectGroup: family,
      } satisfies FlatCalendarEvent;
    });
  }, [data]);

  const range = useMemo(() => computeRange(view, anchor), [view, anchor]);

  const timelineRows: TimelineRow[] = useMemo(() => {
    const groups = new Map<string, TimelineRow>();
    for (const e of flat) {
      const key = e.subjectGroup;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          group: key,
          label: key,
          events: [],
        });
      }
      groups.get(key)!.events.push({
        id: e.id,
        start: e.start,
        end: e.end,
        kind: e.kind as AvailabilityKind | ExtraKind,
        title: e.title,
        note: e.note,
      });
    }
    return Array.from(groups.values());
  }, [flat]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Agenda y reuniones</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tus próximos compromisos y citas.</p>
      </header>
      <div className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
        <p className="font-display text-base text-foreground">Solicitud de reuniones vía Calendly · próximamente</p>
        <p className="mt-1">
          La reserva de reuniones con tu agente se vinculará a <strong>Calendly</strong> en una próxima actualización.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {[
          { k: "kanban" as const, label: "Kanban", icon: KanbanSquare },
          { k: "calendar" as const, label: "Calendario", icon: CalendarDays },
          { k: "gantt" as const, label: "Gantt", icon: GanttChart },
        ].map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm transition-colors ${
              tab === k
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
        {(tab === "calendar" || tab === "gantt") && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAnchor(stepAnchor(view, anchor, -1))}>‹</Button>
            <span className="smallcaps text-xs text-muted-foreground min-w-[140px] text-center">
              {rangeLabel(view, range.start, range.end)}
            </span>
            <Button variant="outline" size="sm" onClick={() => setAnchor(stepAnchor(view, anchor, 1))}>›</Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Hoy</Button>
            {tab === "gantt" && (
              <select
                value={view}
                onChange={(e) => setView(e.target.value as CalendarView)}
                className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
              >
                {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
                  <option key={v} value={v}>{VIEW_LABELS[v]}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : tab === "kanban" ? (
        <CalendarKanban events={flat} />
      ) : tab === "calendar" ? (
        <CalendarMonthGrid anchor={anchor} events={flat} />
      ) : tab === "gantt" ? (
        <TimelineCalendar rows={timelineRows} start={range.start} end={range.end} ticks={range.ticks} />
      ) : null}

      {!isLoading && data?.past?.length ? (
        <section className="space-y-3">
          <h3 className="font-display text-xl">Actas de reuniones</h3>
          <ul className="space-y-3">
            {data.past.map((e) => (
              <li key={e.id} className="rounded-sm border border-border p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-display text-lg">{e.title || "Reunión"}</p>
                  <span className="smallcaps text-xs text-muted-foreground">{e.start_date}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{e.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}