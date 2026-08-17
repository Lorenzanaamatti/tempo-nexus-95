import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/paperwork/deal-memos")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Paperwork</p>
      <h1 className="mt-2 font-display text-5xl font-extrabold title-caps">Deal memos</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
        Sección en construcción. El contenido de esta pantalla se implementará en la siguiente fase.
      </p>
    </div>
  );
}
