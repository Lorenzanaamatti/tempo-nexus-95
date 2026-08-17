import { createFileRoute } from "@tanstack/react-router";
import { CalendarBoard } from "@/components/calendar-board/calendar-board";
import { CAL_VIEWS, CAL_PICKER_KEYS, mergeCalViews } from "@/lib/calendar-board";
import { Plus, X, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type { Category } from "@/lib/calendar-board";
export { CalendarBoard };

export const Route = createFileRoute("/_authenticated/_admin/calendar")({
  validateSearch: (s: { view?: unknown }) => ({ view: typeof s.view === "string" ? s.view : undefined }),
  component: GlobalCalendar,
});

function GlobalCalendar() {
  const { view } = Route.useSearch();
  const nav = Route.useNavigate();
  const selected = (view ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  const merged = mergeCalViews(selected);

  const go = (keys: string[]) =>
    nav({ search: { view: keys.length ? keys.join(",") : undefined } });

  if (!merged) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Calendarios</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold title-caps">Elige una vista</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Abre el calendario general o entra directamente en una vista temática. Dentro de una vista
          podrás añadir otras para combinarlas.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAL_PICKER_KEYS.map((key) => {
            const v = CAL_VIEWS.find((x) => x.key === key)!;
            return (
              <button
                key={key}
                type="button"
                onClick={() => go([key])}
                className="group flex items-center gap-3 rounded-sm border border-border p-5 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <CalendarDays className="h-5 w-5 text-primary" />
                <span className="font-display text-lg font-semibold">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1.5 px-6 pt-6">
        <button
          type="button"
          onClick={() => go([])}
          className="rounded-sm border border-border px-3 py-1 text-xs opacity-70 transition hover:opacity-100"
        >
          ← Vistas
        </button>
        {merged.keys.map((key) => {
          const v = CAL_VIEWS.find((x) => x.key === key)!;
          return (
            <span
              key={key}
              className="flex items-center gap-1 rounded-sm border border-foreground bg-foreground px-3 py-1 text-xs text-background"
            >
              {v.label}
              {merged.keys.length > 1 && (
                <button
                  type="button"
                  aria-label={`Quitar vista ${v.label}`}
                  onClick={() => go(merged.keys.filter((k) => k !== key))}
                  className="opacity-70 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded-sm border border-primary px-3 py-1 text-xs text-primary transition hover:bg-primary/10"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir vista
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            {CAL_PICKER_KEYS.filter((k) => !merged.keys.includes(k)).map((key) => {
              const v = CAL_VIEWS.find((x) => x.key === key)!;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => go([...merged.keys, key])}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {v.label}
                </button>
              );
            })}
            {CAL_PICKER_KEYS.every((k) => merged.keys.includes(k)) && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Todas las vistas activas</p>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <CalendarBoard
        key={merged.keys.join(",")}
        initialCategories={merged.cats}
        initialOnlyMine={merged.onlyMine}
        subjectTypes={merged.subjectTypes}
        title={merged.keys.length === 1 && merged.keys[0] === "global" ? "Calendario general" : `Calendario · ${merged.label}`}
      />
    </div>
  );
}
