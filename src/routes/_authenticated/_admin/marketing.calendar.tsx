import { createFileRoute } from "@tanstack/react-router";
import { CalendarBoard } from "./calendar";

export const Route = createFileRoute("/_authenticated/_admin/marketing/calendar")({
  component: MarketingCalendar,
});

function MarketingCalendar() {
  return (
    <CalendarBoard
      lockedCategory="marketing"
      eyebrow="Marketing"
      title="Calendario MKTG"
      description={
        <>
          Vista filtrada del calendario general por la categoría <span className="font-mono">marketing</span>:
          estrenos, check-ins de onboarding, publicaciones y campañas. Los datos se comparten con el calendario general.
        </>
      }
    />
  );
}