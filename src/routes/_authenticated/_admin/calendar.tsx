import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  type AvailabilityKind,
} from "@/components/availability-editor";
import { TimelineCalendar } from "@/components/timeline-calendar";
import {
  computeRange,
  rangeLabel,
  stepAnchor,
  VIEW_LABELS,
  type CalendarView,
  type TimelineRow,
} from "@/lib/calendar-api";

export const Route = createFileRoute("/_authenticated/_admin/calendar")({
  component: GlobalCalendar,
});

type PersonRole = "ic_team" | "composer" | "artist" | "supervisor";
const ROLE_GROUP: Record<PersonRole, string> = {
  ic_team: "Equipo IC",
  composer: "Compositores",
  artist: "Artistas",
  supervisor: "Supervisores",
};

function GlobalCalendar() {
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [activeRoles, setActiveRoles] = useState<Record<PersonRole, boolean>>({
    ic_team: true,
    composer: true,
    artist: true,
    supervisor: true,
  });
  const [showProductions, setShowProductions] = useState(true);
  const [activeKinds, setActiveKinds] = useState<Record<AvailabilityKind, boolean>>({
    libre: true, ocupado: true, vacaciones: true, personal: true, produccion: true,
  });

  const range = useMemo(() => computeRange(view, anchor), [view, anchor]);

  const peopleQ = useQuery({
    queryKey: ["calendar-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, full_name, role, composer_id")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const productionsQ = useQuery({
    queryKey: ["calendar-productions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productions")
        .select("id, title, color")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const startIso = range.start.toISOString().slice(0, 10);
  const endIso = range.end.toISOString().slice(0, 10);

  const eventsQ = useQuery({
    queryKey: ["calendar-events", startIso, endIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .lte("start_date", endIso)
        .gte("end_date", startIso);
      if (error) throw error;
      return data ?? [];
    },
  });

  // composer_availability still feeds the global calendar so existing data shows up
  const composerAvailQ = useQuery({
    queryKey: ["calendar-composer-availability", startIso, endIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composer_availability")
        .select("id, kind, start_date, end_date, note, composer_id")
        .lte("start_date", endIso)
        .gte("end_date", startIso);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows: TimelineRow[] = useMemo(() => {
    const people = peopleQ.data ?? [];
    const productions = productionsQ.data ?? [];
    const events = eventsQ.data ?? [];
    const composerAvail = composerAvailQ.data ?? [];

    // Index people by composer_id for joining composer_availability
    const personByComposer = new Map<string, any>();
    for (const p of people) if (p.composer_id) personByComposer.set(p.composer_id, p);

    const out: TimelineRow[] = [];

    // People rows
    for (const p of people) {
      const role = p.role as PersonRole;
      if (!activeRoles[role]) continue;
      const personEvents = events
        .filter((e: any) => e.subject_type === "person" && e.subject_id === p.id)
        .filter((e: any) => activeKinds[e.kind as AvailabilityKind])
        .map((e: any) => ({
          id: e.id,
          start: new Date(e.start_date + "T00:00:00"),
          end: new Date(e.end_date + "T23:59:59"),
          kind: e.kind as AvailabilityKind,
          title: e.title ?? undefined,
          note: e.note,
        }));

      // also pull composer_availability for composer-linked people
      if (p.composer_id) {
        for (const a of composerAvail) {
          if (a.composer_id !== p.composer_id) continue;
          if (!activeKinds[a.kind as AvailabilityKind]) continue;
          personEvents.push({
            id: "ca-" + a.id,
            start: new Date(a.start_date + "T00:00:00"),
            end: new Date(a.end_date + "T23:59:59"),
            kind: a.kind as AvailabilityKind,
            title: undefined,
            note: a.note,
          });
        }
      }

      out.push({
        id: p.id,
        group: ROLE_GROUP[role],
        label: p.full_name,
        sublabel: ROLE_GROUP[role],
        to: p.composer_id ? "/composers/$composerId" : "/people/$personId",
        params: p.composer_id ? { composerId: p.composer_id } : { personId: p.id },
        events: personEvents,
      });
    }

    // Production rows
    if (showProductions) {
      for (const pr of productions) {
        const prEvents = events
          .filter((e: any) => e.subject_type === "production" && e.subject_id === pr.id)
          .filter((e: any) => activeKinds[e.kind as AvailabilityKind])
          .map((e: any) => ({
            id: e.id,
            start: new Date(e.start_date + "T00:00:00"),
            end: new Date(e.end_date + "T23:59:59"),
            kind: e.kind as AvailabilityKind,
            title: e.title ?? pr.title,
            note: e.note,
          }));
        out.push({
          id: pr.id,
          group: "Producciones",
          label: pr.title,
          to: "/productions/$productionId",
          params: { productionId: pr.id },
          events: prEvents,
        });
      }
    }

    // Drop rows with no events in range (cleaner view)
    return out.filter((r) =>
      r.events.some((e) => e.end >= range.start && e.start <= range.end)
    );
  }, [peopleQ.data, productionsQ.data, eventsQ.data, composerAvailQ.data, activeRoles, activeKinds, showProductions, range.start, range.end]);

  const loading = peopleQ.isLoading || productionsQ.isLoading || eventsQ.isLoading || composerAvailQ.isLoading;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Interesante Compañía</p>
          <h1 className="mt-1 font-display text-5xl italic">Calendario general</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Vista cruzada de equipo, compositores, artistas, supervisores y producciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setAnchor(stepAnchor(view, anchor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Hoy</Button>
          <Button variant="outline" size="icon" onClick={() => setAnchor(stepAnchor(view, anchor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-3 font-display text-xl italic capitalize min-w-[14ch]">
            {rangeLabel(view, range.start, range.end)}
          </span>
        </div>
      </div>

      {/* View selector */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-sm border px-3 py-1 text-xs transition ${
              view === v ? "border-foreground bg-foreground text-background" : "border-border opacity-70 hover:opacity-100"
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Category filters */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(Object.keys(ROLE_GROUP) as PersonRole[]).map((r) => (
          <FilterChip
            key={r}
            active={activeRoles[r]}
            onClick={() => setActiveRoles((s) => ({ ...s, [r]: !s[r] }))}
          >
            {ROLE_GROUP[r]}
          </FilterChip>
        ))}
        <FilterChip active={showProductions} onClick={() => setShowProductions((v) => !v)}>
          Producciones
        </FilterChip>
      </div>

      {/* Kind filters */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {(Object.keys(AVAILABILITY_LABELS) as AvailabilityKind[]).map((k) => (
          <FilterChip
            key={k}
            active={activeKinds[k]}
            onClick={() => setActiveKinds((s) => ({ ...s, [k]: !s[k] }))}
            className={activeKinds[k] ? AVAILABILITY_COLORS[k] : ""}
          >
            {AVAILABILITY_LABELS[k]}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <p className="font-display italic text-muted-foreground">Cargando calendario…</p>
      ) : (
        <TimelineCalendar rows={rows} start={range.start} end={range.end} ticks={range.ticks} />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-3 py-1 text-xs transition ${
        active ? "border-foreground" : "border-border opacity-60 hover:opacity-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}