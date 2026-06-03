import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/budget")({
  beforeLoad: () => {
    throw redirect({ to: "/finance" });
  },
});