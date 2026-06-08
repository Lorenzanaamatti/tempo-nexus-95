import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User2, GanttChartSquare, CalendarDays, KanbanSquare } from "lucide-react";
import { TimelineCalendar } from "@/components/timeline-calendar";
import { CalendarMonthGrid, type FlatCalendarEvent } from "@/components/calendar-month-grid";
import { CalendarKanban } from "@/components/calendar-kanban";
import {
  computeRange,
  rangeLabel,
  stepAnchor,
  VIEW_LABELS,
  type CalendarView,
  type TimelineRow,
} from "@/lib/calendar-api";
import {
  CALENDAR_SOURCE_LABELS,
  FAMILY_DOT,
  KIND_FAMILY,
  type CalendarSource,
} from "@/lib/calendar-sources";

export const Route = createFileRoute("/_authenticated/_admin/calendar")({
  component: GlobalCalendar,
});

export type Category = "operativo" | "marketing" | "facturacion" | "personal";
const CATEGORY_LABEL: Record<Category, string> = {
  operativo: "Operativo",
  marketing: "Marketing",
  facturacion: "Facturación",
  personal: "Personal",
};
const CATEGORY_DOT: Record<Category, string> = {
  operativo: "bg-violet-500",
  marketing: "bg-sky-500",
  facturacion: "bg-amber-500",
  personal: "bg-emerald-500",
};

const SUBJECT_GROUP_LABEL: Record<string, string> = {
  person: "Equipo & Roster",
  composer: "Compositores",
  production: "Producciones",
  opportunity: "Oportunidades",
  contract: "Contratos",
  production_company: "Productoras",
  platform: "Plataformas",
};

const SUBJECT_LINK: Record<string, { to: string; param: string }> = {
  composer: { to: "/composers/$composerId", param: "composerId" },
  production: { to: "/productions/$productionId", param: "productionId" },
  opportunity: { to: "/opportunities/$opportunityId", param: "opportunityId" },
  contract: { to: "/contracts/$contractId", param: "contractId" },
  person: { to: "/people/$personId", param: "personId" },
};

type Layout = "gantt" | "calendar" | "kanban";
const LAYOUT_LABELS: Record<Layout, string> = {
  gantt: "Gantt",
  calendar: "Calendario",
  kanban: "Kanban",
};
const LAYOUT_ICONS: Record<Layout, typeof GanttChartSquare> = {
  gantt: GanttChartSquare,
  calendar: CalendarDays,
  kanban: KanbanSquare,
};

function GlobalCalendar() {
  return <CalendarBoard />;
}

export function CalendarBoard({
  lockedCategory,
  title = "Calendario general",
  eyebrow = "Interesante Compañía",
  description,
}: {
  lockedCategory?: Category;
  title?: string;
  eyebrow?: string;
  description?: React.ReactNode;
}) {
  const { user } = useAuth();
  const [view, setView] = useState<CalendarView>("month");
  const [layout, setLayout] = useState<Layout>("gantt");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [onlyMine, setOnlyMine] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Record<Category, boolean>>(
    lockedCategory
      ? { operativo: false, marketing: false, facturacion: false, personal: false, [lockedCategory]: true }
      : { operativo: true, marketing: true, facturacion: true, personal: true },
  );
  const [activeSources, setActiveSources] = useState<Record<CalendarSource, boolean>>({
    people: true, productions: true, billing: true, opportunities: true, contracts: true, tasks: true,
  });

  const range = useMemo(() => computeRange(view, anchor), [view, anchor]);
  const startIso = range.start.toISOString().slice(0, 10);
  const endIso = range.end.toISOString().slice(0, 10);

  // Match current user to a `people` row (by email) for "Mis tareas".
  const myPersonQ = useQuery({
    queryKey: ["calendar-my-person", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("people")
        .select("id, full_name")
        .ilike("email", user!.email!)
        .maybeSingle();
      return data;
    },
  });

  // Single source of truth: calendar_events. Triggers mirror actions,
  // contracts, opportunities, productions, sprints and composer onboarding.
  const eventsQ = useQuery({
    queryKey: ["calendar-events-all", startIso, endIso],
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

  // composer_availability has no calendar_events mirror yet; merge as virtual.
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

  // Subject name lookups (small tables, cached aggressively).
  const composersQ = useQuery({
    queryKey: ["calendar-composers-min"],
    queryFn: async () => (await supabase.from("composers").select("id, full_name")).data ?? [],
  });
  const peopleQ = useQuery({
    queryKey: ["calendar-people-min"],
    queryFn: async () => (await supabase.from("people").select("id, full_name, role, composer_id")).data ?? [],
  });
  const productionsQ = useQuery({
    queryKey: ["calendar-productions-min"],
    queryFn: async () => (await supabase.from("productions").select("id, title")).data ?? [],
  });
  const opportunitiesQ = useQuery({
    queryKey: ["calendar-opportunities-min"],
    queryFn: async () => (await supabase.from("opportunities").select("id, title, partner_name")).data ?? [],
  });
  const contractsQ = useQuery({
    queryKey: ["calendar-contracts-min"],
    queryFn: async () => (await supabase.from("contracts").select("id, title, counterparty")).data ?? [],
  });

  const { rows, flatEvents } = useMemo(() => {
    const events = (eventsQ.data ?? []) as any[];
    const avail = (composerAvailQ.data ?? []) as any[];
    const myPersonId = myPersonQ.data?.id ?? null;

    const peopleMap = new Map<string, any>((peopleQ.data ?? []).map((p: any) => [p.id, p]));
    const composersMap = new Map<string, any>((composersQ.data ?? []).map((c: any) => [c.id, c]));
    const productionsMap = new Map<string, any>((productionsQ.data ?? []).map((p: any) => [p.id, p]));
    const opportunitiesMap = new Map<string, any>((opportunitiesQ.data ?? []).map((o: any) => [o.id, o]));
    const contractsMap = new Map<string, any>((contractsQ.data ?? []).map((c: any) => [c.id, c]));

    type Bag = { subject_type: string; subject_id: string; events: any[] };
    const byKey = new Map<string, Bag>();
    const flat: Array<{ subject_type: string; subject_id: string; ev: any; category: Category }> = [];
    const push = (subject_type: string, subject_id: string, ev: any) => {
      const key = `${subject_type}::${subject_id}`;
      if (!byKey.has(key)) byKey.set(key, { subject_type, subject_id, events: [] });
      byKey.get(key)!.events.push(ev);
    };

    for (const e of events) {
      const cat = (e.calendar_category ?? "operativo") as Category;
      if (!activeCategories[cat]) continue;
      const fam = KIND_FAMILY[e.kind] as CalendarSource | undefined;
      if (fam && !activeSources[fam]) continue;
      if (onlyMine) {
        if (!myPersonId) continue;
        const assignedToMe = e.assignee_person_id === myPersonId;
        const aboutMe = e.subject_type === "person" && e.subject_id === myPersonId;
        if (!assignedToMe && !aboutMe) continue;
      }
      push(e.subject_type, e.subject_id, {
        id: e.id,
        start: new Date(e.start_date + "T00:00:00"),
        end: new Date(e.end_date + "T23:59:59"),
        kind: e.kind,
        title: e.title ?? undefined,
        note: e.note,
      });
      flat.push({
        subject_type: e.subject_type,
        subject_id: e.subject_id,
        category: cat,
        ev: {
          id: e.id,
          start: new Date(e.start_date + "T00:00:00"),
          end: new Date(e.end_date + "T23:59:59"),
          kind: e.kind,
          title: e.title ?? undefined,
          note: e.note,
        },
      });
    }

    // Merge composer_availability as virtual events on the composer subject.
    if (!onlyMine && activeSources.people) {
      for (const a of avail) {
        const fam = KIND_FAMILY[a.kind] as CalendarSource | undefined;
        if (fam && !activeSources[fam]) continue;
        const ev = {
          id: "ca-" + a.id,
          start: new Date(a.start_date + "T00:00:00"),
          end: new Date(a.end_date + "T23:59:59"),
          kind: a.kind,
          title: undefined as string | undefined,
          note: a.note,
        };
        push("composer", a.composer_id, ev);
        flat.push({ subject_type: "composer", subject_id: a.composer_id, category: "personal", ev });
      }
    }

    const out: TimelineRow[] = [];
    const subjectMeta = new Map<string, { label: string; group: string; to?: string; params?: Record<string, string> }>();
    for (const { subject_type, subject_id, events: evs } of byKey.values()) {
      let label = subject_id.slice(0, 8);
      let sublabel: string | undefined;
      let toPath: string | undefined;
      let params: Record<string, string> | undefined;

      if (subject_type === "person") {
        const p = peopleMap.get(subject_id);
        if (p) {
          label = p.full_name;
          if (p.composer_id) {
            toPath = "/composers/$composerId";
            params = { composerId: p.composer_id };
          } else {
            toPath = "/people/$personId";
            params = { personId: p.id };
          }
        }
      } else if (subject_type === "composer") {
        const c = composersMap.get(subject_id);
        if (c) {
          label = c.full_name;
          toPath = "/composers/$composerId";
          params = { composerId: c.id };
        }
      } else if (subject_type === "production") {
        const p = productionsMap.get(subject_id);
        if (p) {
          label = p.title;
          toPath = "/productions/$productionId";
          params = { productionId: p.id };
        }
      } else if (subject_type === "opportunity") {
        const o = opportunitiesMap.get(subject_id);
        if (o) {
          label = o.title;
          sublabel = o.partner_name ?? undefined;
          toPath = "/opportunities/$opportunityId";
          params = { opportunityId: o.id };
        }
      } else if (subject_type === "contract") {
        const c = contractsMap.get(subject_id);
        if (c) {
          label = c.title;
          sublabel = c.counterparty ?? undefined;
          toPath = "/contracts/$contractId";
          params = { contractId: c.id };
        }
      } else {
        const link = SUBJECT_LINK[subject_type];
        if (link) {
          toPath = link.to;
          params = { [link.param]: subject_id };
        }
      }

      out.push({
        id: `${subject_type}-${subject_id}`,
        group: SUBJECT_GROUP_LABEL[subject_type] ?? subject_type,
        label,
        sublabel,
        to: toPath,
        params,
        events: evs,
      });
      subjectMeta.set(`${subject_type}::${subject_id}`, {
        label,
        group: SUBJECT_GROUP_LABEL[subject_type] ?? subject_type,
        to: toPath,
        params,
      });
    }
    out.sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));

    const flatEvents: FlatCalendarEvent[] = flat.map((f) => {
      const meta = subjectMeta.get(`${f.subject_type}::${f.subject_id}`);
      return {
        id: f.ev.id,
        start: f.ev.start,
        end: f.ev.end,
        kind: f.ev.kind,
        title: f.ev.title,
        note: f.ev.note,
        category: f.category,
        subjectLabel: meta?.label ?? f.subject_id.slice(0, 8),
        subjectGroup: meta?.group ?? f.subject_type,
        to: meta?.to,
        params: meta?.params,
      };
    });
    return { rows: out, flatEvents };
  }, [eventsQ.data, composerAvailQ.data, peopleQ.data, composersQ.data, productionsQ.data, opportunitiesQ.data, contractsQ.data, myPersonQ.data, activeCategories, activeSources, onlyMine]);

  const loading = eventsQ.isLoading || composerAvailQ.isLoading || peopleQ.isLoading || composersQ.isLoading || productionsQ.isLoading || opportunitiesQ.isLoading || contractsQ.isLoading;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-1 font-display text-5xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {description ?? (
              <>
                Una sola fuente: <span className="font-mono">calendar_events</span>. Tareas, contratos,
                entregas, estrenos, check-ins y publicaciones aparecen automáticamente.
              </>
            )}
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
          <span className="ml-3 font-display text-xl capitalize min-w-[14ch]">
            {rangeLabel(view, range.start, range.end)}
          </span>
        </div>
      </div>

      {/* Layout selector */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {(Object.keys(LAYOUT_LABELS) as Layout[]).map((l) => {
          const Icon = LAYOUT_ICONS[l];
          return (
            <button
              key={l}
              onClick={() => setLayout(l)}
              className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 text-xs transition ${
                layout === l ? "border-foreground bg-foreground text-background" : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {LAYOUT_LABELS[l]}
            </button>
          );
        })}
      </div>

      {/* Range selector — only relevant for Gantt */}
      {layout === "gantt" && (
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
      )}

      {/* Category chips + Mis tareas */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {!lockedCategory && (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
          <FamilyChip
            key={c}
            active={activeCategories[c]}
            dotClass={CATEGORY_DOT[c]}
            onClick={() => setActiveCategories((p) => ({ ...p, [c]: !p[c] }))}
          >
            {CATEGORY_LABEL[c]}
          </FamilyChip>
        ))}
        <button
          type="button"
          onClick={() => setOnlyMine((m) => !m)}
          disabled={!myPersonQ.data}
          title={myPersonQ.data ? `Solo tareas asignadas a ${myPersonQ.data.full_name}` : "No hay persona asociada a tu usuario"}
          className={`ml-2 inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 text-xs transition ${
            onlyMine ? "border-foreground bg-foreground text-background" : "border-border opacity-70 hover:opacity-100"
          } disabled:opacity-30`}
        >
          <User2 className="h-3 w-3" /> Mis tareas
        </button>
      </div>

      {/* Source family filters — secondary axis */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {(Object.keys(CALENDAR_SOURCE_LABELS) as CalendarSource[]).map((s) => (
          <FamilyChip
            key={s}
            active={activeSources[s]}
            dotClass={FAMILY_DOT[s]}
            onClick={() => setActiveSources((p) => ({ ...p, [s]: !p[s] }))}
          >
            {CALENDAR_SOURCE_LABELS[s]}
          </FamilyChip>
        ))}
      </div>

      {loading ? (
        <p className="font-display text-muted-foreground">Cargando calendario…</p>
      ) : layout === "calendar" ? (
        <CalendarMonthGrid anchor={anchor} events={flatEvents} />
      ) : layout === "kanban" ? (
        <CalendarKanban events={flatEvents} />
      ) : (
        <TimelineCalendar rows={rows} start={range.start} end={range.end} ticks={range.ticks} />
      )}
    </div>
  );
}

function FamilyChip({
  active,
  onClick,
  children,
  dotClass,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dotClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1 text-xs transition ${
        active
          ? "border-foreground bg-foreground/[0.04]"
          : "border-border opacity-50 hover:opacity-90"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${dotClass} ${active ? "" : "opacity-40"}`} />
      {children}
    </button>
  );
}