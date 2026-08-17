import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/empresa/roster-prospects")({
  beforeLoad: () => {
    throw redirect({ to: "/oportunidades/prospects-fichaje" });
  },
});
