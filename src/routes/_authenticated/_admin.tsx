import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { role, loading } = useCurrentRole();
  useEffect(() => {
    if (!loading && role && role !== "admin") window.location.replace("/me");
  }, [role, loading]);
  if (loading) {
    return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  }
  if (role !== "admin") return null;
  return <Outlet />;
}