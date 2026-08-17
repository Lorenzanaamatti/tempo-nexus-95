import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User2, GanttChartSquare, CalendarDays, KanbanSquare, SlidersHorizontal } from "lucide-react";
import { TimelineCalendar } from "@/components/timeline-calendar";
import { CalendarMonthGrid } from "@/components/calendar-month-grid";
import { CalendarKanban } from "@/components/calendar-kanban";
import { BrandLogo } from "@/components/brand-logo";
import { format as formatDate } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { computeRange, stepAnchor, VIEW_LABELS, type CalendarView } from "@/lib/calendar-api";
import {
  buildCalendarModel,
  initialCategoryState,
  CATEGORY_DOT,
  CATEGORY_LABEL,
  LAYOUT_LABELS,
  type Category,
  type Layout,
} from "@/lib/calendar-board";
import { useCalendarBoardData } from "./use-calendar-board-data";
import { FamilyChip, SubjectFilters } from "./calendar-filters";

const LAYOUT_ICONS: Record<Layout, typeof GanttChartSquare> = {
  gantt: GanttChartSquare,
  calendar: CalendarDays,
  kanban: KanbanSquare,
};

const ARROW_LABELS: Record<CalendarView, { prev: string; next: string }> = {
  day: { prev: "Día anterior", next: "Día siguiente" },
  week: { prev: "Semana anterior", next: "Semana siguiente" },
  month: { prev: "Mes anterior", next: "Mes siguiente" },
  quarter: { prev: "Trimestre anterior", next: "Trimestre siguiente" },
  semester: { prev: "Semestre anterior", next: "Semestre siguiente" },
  year: { prev: "Año anterior", next: "Año siguiente" },
  "2y": { prev: "2 años atrás", next: "2 años adelante" },
  "3y": { prev: "3 años atrás", next: "3 años adelante" },
};

export function CalendarBoard({
  lockedCategory,
  initialCategories,
  initialOnlyMine = false,
  subjectTypes,
  title = "Calendario general",
  eyebrow,
  description,
}: {
  lockedCategory?: Category;
  initialCategories?: Category[];
  initialOnlyMine?: boolean;
  subjectTypes?: string[];
  title?: string;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
}) {
  const { user } = useAuth();
  const [view, setView] = useState<CalendarView>("month");
  const [layout, setLayout] = useState<Layout>(initialOnlyMine ? "kanban" : "gantt");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [onlyMine, setOnlyMine] = useState(initialOnlyMine);
  const [activeCategories, setActiveCategories] = useState<Record<Category, boolean>>(() => {
    const base = initialCategoryState(lockedCategory, initialCategories);
    // "Personal" solo existe en la vista Personal (Equipo)
    return initialOnlyMine ? base : { ...base, personal: false };
  });
  // En vistas que no son "Personal" no se ofrecen filtros por sujeto (Equipo / Roster)
  const showSubjectFilters = initialOnlyMine;
  const visibleCategories = (Object.keys(CATEGORY_LABEL) as Category[]).filter(
    (c) => initialOnlyMine || c !== "personal",
  );
  // Subjects not present in the map are considered visible (default-on).
  const [hiddenSubjects, setHiddenSubjects] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount =
    (lockedCategory ? 0 : visibleCategories.filter((c) => !activeCategories[c]).length) +
    (showSubjectFilters ? hiddenSubjects.size : 0);
  const toggleSubject = (key: string) =>
    setHiddenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const effectiveView: CalendarView = layout === "gantt" ? view : "month";
  const range = useMemo(() => computeRange(effectiveView, anchor), [effectiveView, anchor]);
  const startIso = range.start.toISOString().slice(0, 10);
  const endIso = range.end.toISOString().slice(0, 10);

  const data = useCalendarBoardData({
    userId: user?.id,
    userEmail: user?.email ?? undefined,
    startIso,
    endIso,
    enableUnlinkedPeople: initialOnlyMine,
  });

  const { rows, flatEvents } = useMemo(
    () =>
      buildCalendarModel({
        events: (data.eventsQ.data ?? []) as any[],
        availability: (data.composerAvailQ.data ?? []) as any[],
        people: (data.peopleQ.data ?? []) as any[],
        composers: (data.composersQ.data ?? []) as any[],
        productions: (data.productionsQ.data ?? []) as any[],
        opportunities: (data.opportunitiesQ.data ?? []) as any[],
        contracts: (data.contractsQ.data ?? []) as any[],
        targetAccounts: (data.targetAccountsQ.data ?? []) as any[],
        actions: (data.actionsQ.data ?? []) as any[],
        oppActions: (data.oppActionsQ.data ?? []) as any[],
        phases: (data.phasesQ.data ?? []) as any[],
        sprints: (data.sprintsQ.data ?? []) as any[],
        myPersonId: data.myPersonQ.data?.id ?? null,
        activeCategories,
        hiddenSubjects,
        onlyMine,
        subjectTypes,
      }),
    [
      data.eventsQ.data, data.composerAvailQ.data, data.peopleQ.data, data.composersQ.data,
      data.productionsQ.data, data.opportunitiesQ.data, data.contractsQ.data, data.targetAccountsQ.data,
      data.actionsQ.data, data.oppActionsQ.data, data.phasesQ.data, data.sprintsQ.data,
      data.myPersonQ.data, activeCategories, hiddenSubjects, onlyMine, subjectTypes,
    ],
  );

  const onMoveTask = (actionId: string, newDateIso: string) =>
    data.moveTaskMut.mutate({ actionId, newDate: newDateIso });

  const now = new Date();
  const todayInRange = now >= range.start && now < range.end;
  const friendlyRangeLabel = (() => {
    const s = range.start;
    const e = new Date(range.end.getTime() - 1);
    if (effectiveView === "day") return formatDate(s, "d 'de' MMMM 'de' yyyy", { locale: es });
    if (effectiveView === "week")
      return `${formatDate(s, "d MMM", { locale: es })} – ${formatDate(e, "d MMM yyyy", { locale: es })}`;
    if (effectiveView === "month") return formatDate(s, "MMMM yyyy", { locale: es });
    if (effectiveView === "year") return formatDate(s, "yyyy", { locale: es });
    return `${formatDate(s, "MMM yyyy", { locale: es })} – ${formatDate(e, "MMM yyyy", { locale: es })}`;
  })();

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <div className="mb-1">{eyebrow ?? <BrandLogo variant="auto" className="h-5 w-auto" />}</div>
          <h1 className="mt-1 font-display text-5xl title-caps">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {description ?? (
              <>
                Todos los eventos de IC en un solo sitio: tareas, contratos, entregas, estrenos,
                check-ins y publicaciones aparecen automáticamente.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            title={ARROW_LABELS[effectiveView].prev}
            aria-label={ARROW_LABELS[effectiveView].prev}
            onClick={() => setAnchor(stepAnchor(effectiveView, anchor, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title={ARROW_LABELS[effectiveView].next}
            aria-label={ARROW_LABELS[effectiveView].next}
            onClick={() => setAnchor(stepAnchor(effectiveView, anchor, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-3 font-display text-xl capitalize min-w-[14ch]">{friendlyRangeLabel}</span>
          {!todayInRange && (
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="ml-2 rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Volver a hoy
            </button>
          )}
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

      {/* Filtros plegados por defecto; "Mis tareas" siempre visible */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {filtersOpen ? "Ocultar filtros" : "Filtros"}
          {!filtersOpen && activeFilterCount > 0 && (
            <span className="rounded-sm bg-muted px-1.5 font-mono text-[10px]">{activeFilterCount}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setOnlyMine((m) => !m)}
          disabled={!data.myPersonQ.data}
          title={data.myPersonQ.data ? `Solo tareas asignadas a ${data.myPersonQ.data.full_name}` : "Vincula tu usuario abajo para activarlo"}
          style={{
            backgroundColor: onlyMine ? "#FF073A" : "transparent",
            borderColor: "#FF073A",
            color: onlyMine ? "#fff" : "#FF073A",
            boxShadow: onlyMine ? "0 0 12px rgba(255, 7, 58, 0.55)" : undefined,
          }}
          className="ml-2 inline-flex items-center gap-1.5 rounded-sm border-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider transition disabled:opacity-40"
        >
          <User2 className="h-3 w-3" /> Mis tareas
        </button>
      </div>

      {filtersOpen && !lockedCategory && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {visibleCategories.map((c) => (
            <FamilyChip
              key={c}
              active={activeCategories[c]}
              dotClass={CATEGORY_DOT[c]}
              onClick={() => setActiveCategories((p) => ({ ...p, [c]: !p[c] }))}
            >
              {CATEGORY_LABEL[c]}
            </FamilyChip>
          ))}
        </div>
      )}

      {initialOnlyMine && !data.myPersonQ.data && (
        <div
          className="mb-4 flex flex-wrap items-center gap-2 rounded-sm border-2 px-3 py-2 text-xs"
          style={{ borderColor: "#FF073A", backgroundColor: "rgba(255, 7, 58, 0.06)" }}
        >
          <span style={{ color: "#FF073A" }} className="font-semibold uppercase tracking-wider">
            Soy…
          </span>
          <span className="text-muted-foreground">
            Tu usuario aún no está vinculado a ninguna persona del equipo. Elige quién eres:
          </span>
          <select
            defaultValue=""
            disabled={data.linkMeMut.isPending}
            onChange={(e) => {
              const id = e.target.value;
              if (id) data.linkMeMut.mutate(id);
            }}
            className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="" disabled>
              Selecciona una persona…
            </option>
            {(data.unlinkedPeopleQ.data ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Source family filters — secondary axis */}
      {filtersOpen && showSubjectFilters && (
        <SubjectFilters
          people={(data.peopleQ.data ?? []) as any[]}
          composers={(data.composersQ.data ?? []) as any[]}
          hidden={hiddenSubjects}
          onToggle={toggleSubject}
          onSetAll={(keys, visible) =>
            setHiddenSubjects((prev) => {
              const next = new Set(prev);
              if (visible) for (const k of keys) next.delete(k);
              else for (const k of keys) next.add(k);
              return next;
            })
          }
        />
      )}

      {data.loading ? (
        <p className="font-display text-muted-foreground">Cargando calendario…</p>
      ) : layout === "calendar" ? (
        <CalendarMonthGrid anchor={anchor} events={flatEvents} onMoveTask={onMoveTask} />
      ) : layout === "kanban" ? (
        <CalendarKanban events={flatEvents} onMoveTask={onMoveTask} />
      ) : (
        <TimelineCalendar rows={rows} start={range.start} end={range.end} ticks={range.ticks} onMoveTask={onMoveTask} />
      )}
    </div>
  );
}
