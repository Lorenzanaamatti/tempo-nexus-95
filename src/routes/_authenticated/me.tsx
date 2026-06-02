import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/me")({
  component: ComposerSelf,
});

function ComposerSelf() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="smallcaps text-muted-foreground">Panel del compositor</p>
      <h1 className="mt-2 font-display text-5xl">Tu ficha</h1>
      <p className="mt-4 text-muted-foreground">
        El panel personal del compositor se activará en la segunda fase, una vez validemos el módulo
        de roster con el equipo de IC.
      </p>
    </div>
  );
}