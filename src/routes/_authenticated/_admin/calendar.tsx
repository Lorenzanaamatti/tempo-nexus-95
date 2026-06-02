import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import {
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
import {
  CALENDAR_SOURCE_LABELS,
  EXTRA_KIND_LABELS,
  FAMILY_DOT,
  KIND_FAMILY,
  type CalendarSource,
  type ExtraKind,
} from "@/lib/calendar-sources";

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
  const [activeSources, setActiveSources] = useState<Record<CalendarSource, boolean>>({
    people: true,
    productions: true,
    billing: true,
    opportunities: true,
    contracts: true,
    tasks: true,
  });
  const [activeKinds, setActiveKinds] = useState<Record<AvailabilityKind, boolean>>({
    libre: true, ocupado: true, vacaciones: true, personal: true, produccion: true,
    facturacion: true, pago: true, cobro: true,
  });
  const [activeExtras, setActiveExtras] = useState<Record<ExtraKind, boolean>>({
    oportunidad_detectada: true,
    oportunidad_contacto: true,
    oportunidad_cierre: true,
    contrato_firma: true,
    contrato_fin: true,
    contrato_preaviso: true,
    tarea: true,
    estreno: true,
    entrega: true,
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
        .select("id, title, color, premiere_date, delivery_date")
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

  const opportunitiesQ = useQuery({
    queryKey: ["calendar-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, title, detected_date, last_contact_date, expected_close_date, partner_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const opportunityActionsQ = useQuery({
    queryKey: ["calendar-actions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("actions")
        .select("id, title, due_date, done, subject_type, subject_id, kind");
      if (error) throw error;
      return data ?? [];
    },
  });

  const contractsQ = useQuery({
    queryKey: ["calendar-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, title, signed_date, end_date, notice_date, counterparty, sign_status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows: TimelineRow[] = useMemo(() => {
    const people = peopleQ.data ?? [];
    const productions = productionsQ.data ?? [];
    const events = eventsQ.data ?? [];
    const composerAvail = composerAvailQ.data ?? [];
    const opportunities = opportunitiesQ.data ?? [];
    const oppActions = opportunityActionsQ.data ?? [];
    const contracts = contractsQ.data ?? [];

    // Index people by composer_id for joining composer_availability
    const personByComposer = new Map<string, any>();
    for (const p of people) if (p.composer_id) personByComposer.set(p.composer_id, p);

    const out: TimelineRow[] = [];

    // People rows
    if (activeSources.people)
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
    if (activeSources.productions || activeSources.billing) {
      for (const pr of productions) {
        const prEvents: any[] = events
          .filter((e: any) => e.subject_type === "production" && e.subject_id === pr.id)
          .filter((e: any) => {
            const k = e.kind as AvailabilityKind;
            const isBilling = k === "facturacion" || k === "pago" || k === "cobro";
            if (isBilling && !activeSources.billing) return false;
            if (!isBilling && !activeSources.productions) return false;
            return activeKinds[k];
          })
          .map((e: any) => ({
            id: e.id,
            start: new Date(e.start_date + "T00:00:00"),
            end: new Date(e.end_date + "T23:59:59"),
            kind: e.kind as AvailabilityKind,
            title: e.title ?? pr.title,
            note: e.note,
          }));
        // Hitos de producción (estreno / entrega) desde la propia tabla productions
        if (activeSources.productions) {
          if ((pr as any).premiere_date && activeExtras.estreno) {
            const d = new Date((pr as any).premiere_date + "T00:00:00");
            prEvents.push({ id: `pr-pre-${pr.id}`, start: d, end: d, kind: "estreno", title: `Estreno · ${pr.title}`, note: null });
          }
          if ((pr as any).delivery_date && activeExtras.entrega) {
            const d = new Date((pr as any).delivery_date + "T00:00:00");
            prEvents.push({ id: `pr-del-${pr.id}`, start: d, end: d, kind: "entrega", title: `Entrega · ${pr.title}`, note: null });
          }
        }
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

    // Oportunidades
    if (activeSources.opportunities) {
      for (const o of opportunities) {
        const evs: any[] = [];
        const push = (date: string | null, kind: ExtraKind, label: string) => {
          if (!date || !activeExtras[kind]) return;
          const d = new Date(date + "T00:00:00");
          evs.push({ id: `op-${kind}-${o.id}`, start: d, end: d, kind, title: `${label} · ${o.title}`, note: o.partner_name });
        };
        push(o.detected_date, "oportunidad_detectada", "Detectada");
        push(o.last_contact_date, "oportunidad_contacto", "Último contacto");
        push(o.expected_close_date, "oportunidad_cierre", "Cierre estimado");
        // tareas asociadas
        if (activeSources.tasks && activeExtras.tarea) {
          for (const a of oppActions) {
            if (a.subject_type !== "opportunity" || a.subject_id !== o.id || !a.due_date) continue;
            const d = new Date(a.due_date + "T00:00:00");
            evs.push({ id: `act-${a.id}`, start: d, end: d, kind: "tarea", title: `${a.done ? "✓ " : ""}${a.title}`, note: o.title });
          }
        }
        if (!evs.length) continue;
        out.push({
          id: `opp-${o.id}`,
          group: "Oportunidades",
          label: o.title,
          sublabel: o.partner_name ?? undefined,
          to: "/opportunities/$opportunityId",
          params: { opportunityId: o.id },
          events: evs,
        });
      }
    }

    // Contratos
    if (activeSources.contracts) {
      for (const c of contracts) {
        const evs: any[] = [];
        const push = (date: string | null, kind: ExtraKind, label: string) => {
          if (!date || !activeExtras[kind]) return;
          const d = new Date(date + "T00:00:00");
          evs.push({ id: `ct-${kind}-${c.id}`, start: d, end: d, kind, title: `${label} · ${c.title}`, note: c.counterparty });
        };
        push(c.signed_date, "contrato_firma", "Firma");
        push(c.notice_date, "contrato_preaviso", "Preaviso");
        push(c.end_date, "contrato_fin", "Fin");
        if (!evs.length) continue;
        out.push({
          id: `ct-${c.id}`,
          group: "Contratos",
          label: c.title,
          sublabel: c.counterparty ?? undefined,
          to: "/contracts/$contractId",
          params: { contractId: c.id },
          events: evs,
        });
      }
    }

    // Drop rows with no events in range (cleaner view)
    return out.filter((r) =>
      r.events.some((e) => e.end >= range.start && e.start <= range.end)
    );
  }, [peopleQ.data, productionsQ.data, eventsQ.data, composerAvailQ.data, opportunitiesQ.data, opportunityActionsQ.data, contractsQ.data, activeRoles, activeKinds, activeSources, activeExtras, range.start, range.end]);

  const loading = peopleQ.isLoading || productionsQ.isLoading || eventsQ.isLoading || composerAvailQ.isLoading || opportunitiesQ.isLoading || contractsQ.isLoading || opportunityActionsQ.isLoading;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Interesante Compañía</p>
          <h1 className="mt-1 font-display text-5xl">Calendario general</h1>
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
          <span className="ml-3 font-display text-xl capitalize min-w-[14ch]">
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

      {/* Source family filters — one row, color-coded by family */}
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

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-1 inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1 text-xs opacity-70 hover:opacity-100 transition"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Más filtros
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-h-[70vh] overflow-y-auto p-4 space-y-4">
            <div>
              <p className="smallcaps mb-2 text-[10px] text-muted-foreground">Roles del equipo</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(ROLE_GROUP) as PersonRole[]).map((r) => (
                  <SubChip
                    key={r}
                    active={activeRoles[r]}
                    onClick={() => setActiveRoles((s) => ({ ...s, [r]: !s[r] }))}
                  >
                    {ROLE_GROUP[r]}
                  </SubChip>
                ))}
              </div>
            </div>

            <SubtypeGroup
              title="Personas — disponibilidad"
              family="people"
              items={(Object.keys(AVAILABILITY_LABELS) as AvailabilityKind[])
                .filter((k) => KIND_FAMILY[k] === "people")
                .map((k) => ({ k, label: AVAILABILITY_LABELS[k], active: activeKinds[k], toggle: () => setActiveKinds((s) => ({ ...s, [k]: !s[k] })) }))}
            />
            <SubtypeGroup
              title="Producciones"
              family="productions"
              items={[
                ...(Object.keys(AVAILABILITY_LABELS) as AvailabilityKind[])
                  .filter((k) => KIND_FAMILY[k] === "productions")
                  .map((k) => ({ k: k as string, label: AVAILABILITY_LABELS[k], active: activeKinds[k], toggle: () => setActiveKinds((s) => ({ ...s, [k]: !s[k] })) })),
                ...(Object.keys(EXTRA_KIND_LABELS) as ExtraKind[])
                  .filter((k) => KIND_FAMILY[k] === "productions")
                  .map((k) => ({ k: k as string, label: EXTRA_KIND_LABELS[k], active: activeExtras[k], toggle: () => setActiveExtras((s) => ({ ...s, [k]: !s[k] })) })),
              ]}
            />
            <SubtypeGroup
              title="Facturación"
              family="billing"
              items={(Object.keys(AVAILABILITY_LABELS) as AvailabilityKind[])
                .filter((k) => KIND_FAMILY[k] === "billing")
                .map((k) => ({ k, label: AVAILABILITY_LABELS[k], active: activeKinds[k], toggle: () => setActiveKinds((s) => ({ ...s, [k]: !s[k] })) }))}
            />
            <SubtypeGroup
              title="Oportunidades"
              family="opportunities"
              items={(Object.keys(EXTRA_KIND_LABELS) as ExtraKind[])
                .filter((k) => KIND_FAMILY[k] === "opportunities")
                .map((k) => ({ k: k as string, label: EXTRA_KIND_LABELS[k], active: activeExtras[k], toggle: () => setActiveExtras((s) => ({ ...s, [k]: !s[k] })) }))}
            />
            <SubtypeGroup
              title="Contratos"
              family="contracts"
              items={(Object.keys(EXTRA_KIND_LABELS) as ExtraKind[])
                .filter((k) => KIND_FAMILY[k] === "contracts")
                .map((k) => ({ k: k as string, label: EXTRA_KIND_LABELS[k], active: activeExtras[k], toggle: () => setActiveExtras((s) => ({ ...s, [k]: !s[k] })) }))}
            />
            <SubtypeGroup
              title="Tareas"
              family="tasks"
              items={(Object.keys(EXTRA_KIND_LABELS) as ExtraKind[])
                .filter((k) => KIND_FAMILY[k] === "tasks")
                .map((k) => ({ k: k as string, label: EXTRA_KIND_LABELS[k], active: activeExtras[k], toggle: () => setActiveExtras((s) => ({ ...s, [k]: !s[k] })) }))}
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <p className="font-display text-muted-foreground">Cargando calendario…</p>
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

function SubChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-2.5 py-0.5 text-[11px] transition ${
        active ? "border-foreground" : "border-border opacity-50 hover:opacity-90"
      }`}
    >
      {children}
    </button>
  );
}

function SubtypeGroup({
  title,
  family,
  items,
}: {
  title: string;
  family: CalendarSource;
  items: { k: string; label: string; active: boolean; toggle: () => void }[];
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${FAMILY_DOT[family]}`} />
        <p className="smallcaps text-[10px] text-muted-foreground">{title}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <SubChip key={it.k} active={it.active} onClick={it.toggle}>
            {it.label}
          </SubChip>
        ))}
      </div>
    </div>
  );
}