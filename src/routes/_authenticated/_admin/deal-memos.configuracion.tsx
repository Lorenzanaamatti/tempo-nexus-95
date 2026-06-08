import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/configuracion")({
  component: ConfiguracionPage,
});

function ConfiguracionPage() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-16 text-center">
      <Settings className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
      <h2 className="font-display text-2xl">Configuración</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Próximamente: ajustes globales del módulo Deal Memos (numeración, validadores por defecto, integraciones).
      </p>
    </div>
  );
}