import { addDays, addMonths, addQuarters, addYears, differenceInDays, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, format, startOfDay, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import type { AvailabilityKind } from "@/components/availability-editor";
import type { ExtraKind } from "@/lib/calendar-sources";

export type AnyKind = AvailabilityKind | ExtraKind;

export type CalendarView =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "semester"
  | "year"
  | "2y"
  | "3y";

export const VIEW_LABELS: Record<CalendarView, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
  quarter: "Trimestre",
  semester: "Semestre",
  year: "Año",
  "2y": "2 años",
  "3y": "3 años",
};

export function computeRange(view: CalendarView, anchor: Date) {
  const a = startOfDay(anchor);
  let start: Date, end: Date, ticks: { date: Date; label: string; major?: boolean }[] = [];
  switch (view) {
    case "day":
      start = a;
      end = addDays(a, 1);
      ticks = [{ date: a, label: format(a, "dd/MM/yyyy", { locale: es }), major: true }];
      break;
    case "week": {
      start = startOfWeek(a, { locale: es });
      end = addDays(start, 7);
      ticks = eachDayOfInterval({ start, end: addDays(end, -1) }).map((d) => ({
        date: d,
        label: format(d, "dd/MM", { locale: es }),
      }));
      break;
    }
    case "month": {
      start = startOfMonth(a);
      end = addMonths(start, 1);
      ticks = eachWeekOfInterval({ start, end: addDays(end, -1) }, { locale: es }).map((d) => ({
        date: d,
        label: format(d, "dd/MM", { locale: es }),
      }));
      break;
    }
    case "quarter": {
      start = startOfQuarter(a);
      end = addQuarters(start, 1);
      ticks = eachMonthOfInterval({ start, end: addDays(end, -1) }).map((d) => ({
        date: d,
        label: format(d, "MM/yyyy", { locale: es }),
        major: true,
      }));
      break;
    }
    case "semester": {
      const month = a.getMonth();
      start = new Date(a.getFullYear(), month < 6 ? 0 : 6, 1);
      end = addMonths(start, 6);
      ticks = eachMonthOfInterval({ start, end: addDays(end, -1) }).map((d) => ({
        date: d,
        label: format(d, "MM/yyyy", { locale: es }),
      }));
      break;
    }
    case "year": {
      start = startOfYear(a);
      end = addYears(start, 1);
      ticks = eachMonthOfInterval({ start, end: addDays(end, -1) }).map((d) => ({
        date: d,
        label: format(d, "MM/yyyy", { locale: es }),
      }));
      break;
    }
    case "2y": {
      start = startOfYear(a);
      end = addYears(start, 2);
      ticks = [];
      for (let i = 0; i < 8; i++) {
        const d = addQuarters(start, i);
        ticks.push({ date: d, label: format(d, "MM/yyyy", { locale: es }), major: i % 4 === 0 });
      }
      break;
    }
    case "3y": {
      start = startOfYear(a);
      end = addYears(start, 3);
      ticks = [];
      for (let i = 0; i < 12; i++) {
        const d = addQuarters(start, i);
        ticks.push({ date: d, label: format(d, "MM/yy", { locale: es }), major: i % 4 === 0 });
      }
      break;
    }
  }
  const totalDays = Math.max(1, differenceInDays(end, start));
  return { start, end, ticks, totalDays };
}

export function rangeLabel(view: CalendarView, start: Date, end: Date) {
  if (view === "day") return format(start, "dd/MM/yyyy", { locale: es });
  if (view === "week")
    return `${format(start, "dd/MM/yyyy", { locale: es })} – ${format(addDays(end, -1), "dd/MM/yyyy", { locale: es })}`;
  if (view === "month") return format(start, "MM/yyyy", { locale: es });
  if (view === "year") return format(start, "yyyy", { locale: es });
  return `${format(start, "MM/yyyy", { locale: es })} – ${format(addDays(end, -1), "MM/yyyy", { locale: es })}`;
}

export function stepAnchor(view: CalendarView, anchor: Date, dir: 1 | -1) {
  switch (view) {
    case "day": return addDays(anchor, dir);
    case "week": return addDays(anchor, 7 * dir);
    case "month": return addMonths(anchor, dir);
    case "quarter": return addQuarters(anchor, dir);
    case "semester": return addMonths(anchor, 6 * dir);
    case "year": return addYears(anchor, dir);
    case "2y": return addYears(anchor, 2 * dir);
    case "3y": return addYears(anchor, 3 * dir);
  }
}

export type TimelineEvent = {
  id: string;
  start: Date;
  end: Date;
  kind: AnyKind;
  title?: string;
  note?: string | null;
};

export type TimelineRow = {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  accent?: string;
  to?: string;
  params?: Record<string, string>;
  events: TimelineEvent[];
};