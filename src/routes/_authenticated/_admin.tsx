import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { role, status, isStaff, loading } = useCurrentRole();
  useEffect(() => {
    if (loading) return;
    if (status === "pending" || status === "rejected") {
      window.location.replace("/pending");
      return;
    }
    if (!isStaff) window.location.replace("/me");
  }, [role, status, isStaff, loading]);
  if (loading) {
    return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  }
  if (!isStaff || status !== "active") return null;
  return <Outlet />;
}