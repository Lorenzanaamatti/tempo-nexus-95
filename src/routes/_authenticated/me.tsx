import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/me")({
  component: MeRedirect,
});

function MeRedirect() {
  useEffect(() => {
    window.location.replace("/portal");
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center font-display text-muted-foreground">
      Abriendo tu portal…
    </div>
  );
}