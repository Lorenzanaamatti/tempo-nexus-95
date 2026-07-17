import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentRole } from "@/lib/use-role";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const { role, loading } = useCurrentRole();

  useEffect(() => {
    if (loading) return;
    window.location.replace(role === "admin" ? "/composers" : "/portal");
  }, [role, loading]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <BrandLogo variant="auto" className="h-10 w-auto" />
    </div>
  );
}