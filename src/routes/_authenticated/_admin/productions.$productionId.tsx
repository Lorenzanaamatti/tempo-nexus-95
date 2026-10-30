import { createFileRoute, redirect } from "@tanstack/react-router";

/** Ficha antigua: ahora todas las producciones usan la ficha única de Producciones activas. */
export const Route = createFileRoute("/_authenticated/_admin/productions/$productionId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/producciones/$productionId", params: { productionId: params.productionId }, replace: true });
  },
});
