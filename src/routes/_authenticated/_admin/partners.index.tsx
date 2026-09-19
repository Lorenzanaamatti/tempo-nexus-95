import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/partners/")({
  beforeLoad: () => {
    throw redirect({ to: "/partners/productoras" });
  },
  component: () => null,
});
