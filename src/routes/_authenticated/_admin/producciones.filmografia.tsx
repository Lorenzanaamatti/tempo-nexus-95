import { createFileRoute, redirect } from "@tanstack/react-router";

/** Redirección: la filmografía vive ahora en EMPRESA > Filmografía IC. */
export const Route = createFileRoute("/_authenticated/_admin/producciones/filmografia")({
  beforeLoad: () => {
    throw redirect({ to: "/empresa/filmografia" });
  },
});
