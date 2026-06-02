import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

function Index() {
  const { role, loading } = useCurrentRole();
  useEffect(() => {
    if (loading) return;
    window.location.replace(role === "admin" ? "/composers" : "/me");
  }, [role, loading]);
  return (
    <div className="flex min-h-screen items-center justify-center font-display text-2xl text-muted-foreground">
      Interesante Compañía
    </div>
  );
}