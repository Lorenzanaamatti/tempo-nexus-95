import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    window.location.replace(user ? "/dashboard" : "/login");
  }, [user, loading]);
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Iniciando Lorenzana…
    </div>
  );
}
