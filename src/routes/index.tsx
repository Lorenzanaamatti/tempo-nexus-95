import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useCurrentRole();
  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.replace("/login");
      return;
    }
    if (roleLoading) return;
    window.location.replace(role === "admin" ? "/composers" : "/me");
  }, [user, loading, role, roleLoading]);
  return (
    <div className="flex min-h-screen items-center justify-center font-display text-2xl italic text-muted-foreground">
      Interesante Compañía
    </div>
  );
}
