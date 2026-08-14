import type { FlatCalendarEvent } from "@/components/calendar-month-grid";
import type { TimelineRow } from "@/lib/calendar-api";
import { KIND_FAMILY } from "@/lib/calendar-sources";

export type Category = "operativo" | "marketing" | "facturacion" | "personal" | "oportunidades";

export const CATEGORY_LABEL: Record<Category, string> = {
  operativo: "Operativo",
  marketing: "Marketing",
  facturacion: "Facturación",
  personal: "Personal",
  oportunidades: "Oportunidades",
};

export const CATEGORY_DOT: Record<Category, string> = {
  operativo: "bg-violet-500",
  marketing: "bg-sky-500",
  facturacion: "bg-amber-500",
  personal: "bg-emerald-500",
  oportunidades: "bg-rose-500",
};

export const SUBJECT_GROUP_LABEL: Record<string, string> = {
  person: "Equipo & Roster",
  composer: "Compositores",
  production: "Producciones",
  opportunity: "Oportunidades",
  contract: "Contratos",
  production_company: "Productoras",
  platform: "Plataformas",
  target_account: "Cuentas objetivo",
};

export const SUBJECT_LINK: Record<string, { to: string; param: string }> = {
  composer: { to: "/composers/$composerId", param: "composerId" },
  production: { to: "/productions/$productionId", param: "productionId" },
  opportunity: { to: "/opportunities/$opportunityId", param: "opportunityId" },
  contract: { to: "/contracts/$contractId", param: "contractId" },
  person: { to: "/people/$personId", param: "personId" },
  target_account: { to: "/marketing/target-accounts/$accountId", param: "accountId" },
};

export type Layout = "gantt" | "calendar" | "kanban";

export const LAYOUT_LABELS: Record<Layout, string> = {
  gantt: "Gantt",
  calendar: "Calendario",
  kanban: "Kanban",
};

export const CAL_VIEWS = [
  { key: "global",       label: "Global",       cats: ["operativo","marketing","facturacion","personal","oportunidades"] as Category[], onlyMine: false },
  { key: "producciones", label: "Producciones", cats: ["operativo"] as Category[], onlyMine: false, subjectTypes: ["production"] as string[] },
  { key: "marketing",    label: "Marketing",    cats: ["marketing"] as Category[], onlyMine: false },
  { key: "economico",    label: "Económico",    cats: ["facturacion"] as Category[], onlyMine: false },
  { key: "personal",     label: "Personal",     cats: ["personal"] as Category[], onlyMine: true },
  { key: "legal",        label: "Legal",        cats: ["operativo"] as Category[], onlyMine: false },
] as const;

export function initialCategoryState(
  lockedCategory?: Category,
  initialCategories?: Category[],
): Record<Category, boolean> {
  const off: Record<Category, boolean> = {
    operativo: false, marketing: false, facturacion: false, personal: false, oportunidades: false,
  };
  if (lockedCategory) return { ...off, [lockedCategory]: true };
  if (initialCategories) {
    const base = { ...off };
    for (const c of initialCategories) base[c] = true;
    return base;
  }
  return { operativo: true, marketing: true, facturacion: true, personal: true, oportunidades: true };
}

type Row = Record<string, any>;

export type CalendarModelInput = {
  events: Row[];
  availability: Row[];
  people: Row[];
  composers: Row[];
  productions: Row[];
  opportunities: Row[];
  contracts: Row[];
  targetAccounts: Row[];
  actions: Row[];
  oppActions: Row[];
  phases: Row[];
  sprints: Row[];
  myPersonId: string | null;
  activeCategories: Record<Category, boolean>;
  hiddenSubjects: Set<string>;
  onlyMine: boolean;
  subjectTypes?: string[];
};

const toMap = (rows: Row[]) => new Map<string, Row>(rows.map((r) => [r.id, r]));

function toEvent(e: Row) {
  return {
    id: e.id,
    start: new Date(e.start_date + "T00:00:00"),
    end: new Date(e.end_date + "T23:59:59"),
    kind: e.kind,
    title: (e.title ?? undefined) as string | undefined,
    note: e.note,
    sourceKind: e.source_kind ?? null,
    sourceActionId: e.source_action_id ?? null,
  };
}

/** Pure projection of calendar rows into timeline rows + flat events. */
export function buildCalendarModel(input: CalendarModelInput): {
  rows: TimelineRow[];
  flatEvents: FlatCalendarEvent[];
} {
  const {
    events, availability, myPersonId, activeCategories, hiddenSubjects, onlyMine, subjectTypes,
  } = input;

  const peopleMap = toMap(input.people);
  const composersMap = toMap(input.composers);
  const productionsMap = toMap(input.productions);
  const opportunitiesMap = toMap(input.opportunities);
  const contractsMap = toMap(input.contracts);
  const targetAccountsMap = toMap(input.targetAccounts);
  const actionsMap = toMap(input.actions);
  const oppActionsMap = toMap(input.oppActions);
  const phasesMap = toMap(input.phases);
  const sprintsMap = toMap(input.sprints);

  type Bag = { subject_type: string; subject_id: string; events: any[] };
  const byKey = new Map<string, Bag>();
  const flat: Array<{ subject_type: string; subject_id: string; ev: any; category: Category }> = [];
  const push = (subject_type: string, subject_id: string, ev: any) => {
    const key = `${subject_type}::${subject_id}`;
    if (!byKey.has(key)) byKey.set(key, { subject_type, subject_id, events: [] });
    byKey.get(key)!.events.push(ev);
  };

  for (const e of events) {
    if (subjectTypes && !subjectTypes.includes(e.subject_type)) continue;
    // Skip orphan references so rows never fall back to UUID-like labels.
    if (e.subject_type === "production" && !productionsMap.has(e.subject_id)) continue;
    if (e.subject_type === "opportunity" && !opportunitiesMap.has(e.subject_id)) continue;
    if (e.subject_type === "contract" && !contractsMap.has(e.subject_id)) continue;
    if (e.subject_type === "composer" && !composersMap.has(e.subject_id)) continue;
    if (e.subject_type === "person" && !peopleMap.has(e.subject_id)) continue;
    if (e.subject_type === "target_account" && !targetAccountsMap.has(e.subject_id)) continue;
    if (e.assignee_person_id && !peopleMap.has(e.assignee_person_id)) continue;
    if (e.source_action_id && !actionsMap.has(e.source_action_id)) continue;
    if (e.source_opp_action_id && !oppActionsMap.has(e.source_opp_action_id)) continue;
    if (e.source_phase_id && !phasesMap.has(e.source_phase_id)) continue;
    if (e.source_sprint_id && !sprintsMap.has(e.source_sprint_id)) continue;

    const fam0 = KIND_FAMILY[e.kind] as string | undefined;
    const isOpp = e.subject_type === "opportunity" || fam0 === "opportunities";
    // Person availability kinds always belong to "Personal".
    const personalKind = e.kind === "vacaciones" || e.kind === "personal" || e.kind === "libre" || e.kind === "ocupado";
    const cat = (
      isOpp ? "oportunidades"
      : (e.subject_type === "person" && personalKind) ? "personal"
      : (e.calendar_category ?? "operativo")
    ) as Category;
    if (!activeCategories[cat]) continue;
    if ((e.subject_type === "person" || e.subject_type === "composer") &&
        hiddenSubjects.has(`${e.subject_type}::${e.subject_id}`)) continue;
    // Hide events assigned to a hidden person, regardless of subject type.
    if (e.assignee_person_id && hiddenSubjects.has(`person::${e.assignee_person_id}`)) continue;
    if (onlyMine) {
      if (!myPersonId) continue;
      const assignedToMe = e.assignee_person_id === myPersonId;
      const aboutMe = e.subject_type === "person" && e.subject_id === myPersonId;
      if (!assignedToMe && !aboutMe) continue;
    }

    const ev = toEvent(e);
    push(e.subject_type, e.subject_id, ev);
    flat.push({ subject_type: e.subject_type, subject_id: e.subject_id, category: cat, ev });
  }

  // Merge composer_availability as virtual events on the composer subject.
  if (!onlyMine && activeCategories.personal) {
    for (const a of availability) {
      if (hiddenSubjects.has(`composer::${a.composer_id}`)) continue;
      if (!composersMap.has(a.composer_id)) continue;
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
    } else if (subject_type === "target_account") {
      const t = targetAccountsMap.get(subject_id);
      if (t) {
        label = t.name;
        toPath = "/marketing/target-accounts/$accountId";
        params = { accountId: t.id };
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
    const action = f.ev.sourceActionId ? actionsMap.get(f.ev.sourceActionId) : null;
    return {
      id: f.ev.id,
      start: f.ev.start,
      end: f.ev.end,
      kind: f.ev.kind,
      title: f.ev.title,
      note: f.ev.note ?? action?.notes ?? null,
      category: f.category,
      subjectLabel: meta?.label ?? f.subject_id.slice(0, 8),
      subjectGroup: meta?.group ?? f.subject_type,
      to: meta?.to,
      params: meta?.params,
      sourceKind: f.ev.sourceKind ?? null,
      sourceActionId: f.ev.sourceActionId ?? null,
      area: action?.area ?? null,
      subarea: action?.subarea ?? null,
    };
  });

  return { rows: out, flatEvents };
}
