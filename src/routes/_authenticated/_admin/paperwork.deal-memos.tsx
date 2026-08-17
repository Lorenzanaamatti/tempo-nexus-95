import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/list-states";

export const Route = createFileRoute("/_authenticated/_admin/paperwork/deal-memos")({
  component: StubPage,
});

function StubPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">PAPERWORK</p>
      <h1 className="mt-2 font-display text-5xl font-extrabold title-caps">Deal Memos</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Deal memos en curso y cerrados.
      </p>
      <div className="mt-10">
        <EmptyState title="Sin contenido" description="Todavía no hay registros en esta sección." />
      </div>
    </div>
  );
}
