import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

type AuthSupabase = typeof supabase & {
  auth: typeof supabase.auth & {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
      approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
      denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
    };
  };
};

function isSameOriginPath(p: string) {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Falta authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await (supabase as AuthSupabase).auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const d: any = data;
    const immediate = d?.redirect_url ?? d?.redirect_to;
    if (immediate && !d?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-10">
      <h1 className="font-display text-2xl">No se pudo cargar la solicitud</h1>
      <p className="mt-2 text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details: any = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const call = approve
      ? (supabase as AuthSupabase).auth.oauth.approveAuthorization(authorization_id)
      : (supabase as AuthSupabase).auth.oauth.denyAuthorization(authorization_id);
    const { data, error } = await call;
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const d: any = data;
    const target = d?.redirect_url ?? d?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("El servidor de autorización no devolvió una URL de destino.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "una aplicación";
  const scopes: string[] = Array.isArray(details?.scopes) ? details.scopes : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <BrandLogo className="h-10 w-auto object-contain" />
      <div className="glass-panel w-full rounded-sm p-6">
        <h1 className="font-display text-2xl">
          Conectar <span className="text-primary">{clientName}</span> a tu cuenta
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {clientName} podrá usar las herramientas activas de este servidor MCP mientras estés autenticado.
          No sustituye a los permisos ni a las políticas de acceso a datos del sistema.
        </p>
        {scopes.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {scopes.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={() => decide(true)}>
            {busy ? "…" : "Aprobar y conectar"}
          </Button>
        </div>
      </div>
    </main>
  );
}

// Silence unused helper warning when imports are shaken.
void isSameOriginPath;