import { createFileRoute } from "@tanstack/react-router";
import { useCurrentRole } from "@/lib/use-role";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/pending")({
  component: PendingPage,
});

function PendingPage() {
  const { status, isStaff, loading } = useCurrentRole();

  useEffect(() => {
    if (loading) return;
    if (status === "active" && isStaff) window.location.replace("/");
    if (status === "active" && !isStaff) window.location.replace("/me");
  }, [status, isStaff, loading]);

  const rejected = status === "rejected";

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="smallcaps text-muted-foreground">
        {rejected ? "Acceso denegado" : "Pendiente de aprobación"}
      </p>
      <h1 className="mt-2 font-display text-4xl">
        {rejected ? "Tu cuenta ha sido rechazada" : "Tu cuenta está en revisión"}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {rejected
          ? "Si crees que se trata de un error, contacta con un administrador de Interesante Compañía."
          : "Un administrador de Interesante Compañía revisará tu solicitud y te asignará un rol. Recibirás acceso en cuanto se apruebe."}
      </p>
      <Button
        variant="outline"
        className="mt-8"
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.replace("/auth");
        }}
      >
        Cerrar sesión
      </Button>
    </div>
  );
}
