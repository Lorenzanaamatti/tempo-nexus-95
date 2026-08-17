import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { EmptyState, ListSkeleton } from "@/components/list-states";
import { PageCrumb } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeEs } from "@/lib/dates";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/empresa/agentes/$agentId")({
  component: AgentDetail,
});

const RESULT_LABEL: Record<string, string> = {
  approved: "Aprobada",
  rejected: "Rechazada",
  pending: "Pendiente",
  failed: "Error",
};

function AgentDetail() {
  const { agentId } = Route.useParams();
  const { isBigC, loading } = useCurrentRole();

  const { data, isLoading } = useQuery({
    queryKey: ["agent-log", agentId],
    queryFn: async () => {
      const [{ data: agent }, { data: log }] = await Promise.all([
        db.from("people").select("id, full_name, agent_description, agent_active").eq("id", agentId).maybeSingle(),
        db.from("agent_actions").select("*").eq("agent_person_id", agentId).order("requested_at", { ascending: false }).limit(200),
      ]);
      return { agent, log: (log ?? []) as Record<string, any>[] };
    },
    enabled: isBigC,
  });

  if (loading) return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  if (!isBigC) return <div className="mx-auto max-w-4xl px-6 py-10"><EmptyState title="Sin acceso" description="Solo BIG C." /></div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <PageCrumb label={data?.agent?.full_name ?? "Agente"} />
          <h1 className="mt-1 font-display text-4xl title-caps">{data?.agent?.full_name ?? "—"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data?.agent?.agent_description ?? ""}</p>
        </div>
        <Button variant="outline" asChild><Link to="/empresa/agentes">Volver</Link></Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : !data?.log.length ? (
        <EmptyState title="Sin actividad" description="Este agente todavía no ha propuesto acciones." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>{["Fecha", "Acción", "Resultado", "Validador", "Motivo"].map((h) => (
                <th key={h} className="px-3 py-2 smallcaps text-xs">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.log.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-muted-foreground">{formatDateTimeEs(r.decided_at ?? r.requested_at)}</td>
                  <td className="px-3 py-2 font-display">{r.summary ?? r.tool_name}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="rounded-sm text-[10px]">{RESULT_LABEL[r.status] ?? r.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.decided_by_user_id ? "Validado" : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.decision_notes ?? r.error_message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
