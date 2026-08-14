import { createFileRoute } from "@tanstack/react-router";
import { CalendarBoard } from "@/components/calendar-board/calendar-board";
import { CAL_VIEWS } from "@/lib/calendar-board";

export type { Category } from "@/lib/calendar-board";
export { CalendarBoard };

export const Route = createFileRoute("/_authenticated/_admin/calendar")({
  validateSearch: (s: { view?: unknown }) => ({ view: (s.view as string) ?? "global" }),
  component: GlobalCalendar,
});

function GlobalCalendar() {
  const { view } = Route.useSearch();
  const nav = Route.useNavigate();
  const preset = CAL_VIEWS.find((v) => v.key === view) ?? CAL_VIEWS[0];
  return (
    <div>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1.5 px-6 pt-6">
        {CAL_VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => nav({ search: { view: v.key } })}
            className={`rounded-sm border px-3 py-1 text-xs transition ${
              preset.key === v.key ? "border-foreground bg-foreground text-background" : "border-border opacity-70 hover:opacity-100"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <CalendarBoard
        key={preset.key}
        initialCategories={preset.cats}
        initialOnlyMine={preset.onlyMine}
        subjectTypes={"subjectTypes" in preset ? (preset as { subjectTypes?: string[] }).subjectTypes : undefined}
        title={preset.key === "global" ? "Calendario general" : `Calendario · ${preset.label}`}
      />
    </div>
  );
}
